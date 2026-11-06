"use node";

import { action, internalAction, type ActionCtx } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
  matchScheduleEntry,
  planScheduleSync,
  scheduleRound,
  scheduleSessionTimes,
  type RaceData,
} from "../lib/scheduleSync";
import {
  JOLPICA_BASE_URL,
  JOLPICA_PAGE_LIMIT,
  driversFromDriverList,
  driversFromStandings,
  parseOfficialResults,
  toRaceData,
  type JolpicaData,
  type SeasonDriverRow,
} from "../lib/jolpica";

/*
 * Race data comes from Jolpica F1 (see lib/jolpica). The action names still
 * say "F1Connect" so the app's callers stay unchanged.
 *
 * Jolpica allows about 4 requests a second and 500 an hour per client. The
 * hourly results cron makes three requests per unsynced race and the 6-hourly
 * calendar cron one, well inside that.
 */

/** GET a Jolpica endpoint, e.g. `2026/races`, and return its MRData body. */
async function jolpica(path: string): Promise<JolpicaData> {
  const url = `${JOLPICA_BASE_URL}/${path}/?limit=${JOLPICA_PAGE_LIMIT}`;
  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Jolpica request failed: ${response.status} ${response.statusText} (${url}). ` +
        errorText.substring(0, 200)
    );
  }

  const data = (await response.json()) as { MRData?: JolpicaData };
  if (!data?.MRData) {
    throw new Error(`Unexpected Jolpica response from ${url}`);
  }
  return data.MRData;
}

/** Fetch a season's calendar, in the shape lib/scheduleSync works on. */
async function fetchSeasonSchedule(year: number): Promise<RaceData[]> {
  const data = await jolpica(`${year}/races`);
  return (data.RaceTable?.Races ?? []).map(toRaceData);
}

/**
 * Get the next upcoming race.
 */
export const getNextRace = action({
  args: {},
  handler: async () => {
    const data = await jolpica("current/next/races");
    const next = data.RaceTable?.Races[0];
    if (!next) return null;

    const race = toRaceData(next);
    return {
      raceId: race.raceId,
      raceName: race.raceName,
      round: race.round,
      date: next.date,
      time: next.time,
      circuit: race.circuit?.circuitName,
      location: race.circuit?.city,
      country: race.circuit?.country,
      sessionTimes: scheduleSessionTimes(race),
    };
  },
});

type SeasonSyncResult = {
  seasonId: Id<"seasons">;
  racesSynced: number;
  racesCreated: number;
  racesUpdated: number;
  racesCancelled: number;
  racesReinstated: number;
  /** Missing upstream but not cancelled yet (grace period or truncated response). */
  orphanedRaces: { raceId: Id<"races">; round: number; name: string }[];
};

/**
 * Bring a season's races in line with Jolpica's calendar: create races it
 * added, update moved or renamed ones, and cancel races it dropped once they
 * have been missing for MISSING_RACE_GRACE_MS (24h). The rules live in
 * lib/scheduleSync so they can be tested; this function only does the I/O.
 */
async function syncSeason(
  ctx: ActionCtx,
  year: number
): Promise<SeasonSyncResult> {
  // Validate year range (F1 started 1950, allow future seasons)
  const minYear = 1950;
  const maxYear = 2030;
  if (year < minYear || year > maxYear) {
    throw new Error(`Year must be between ${minYear} and ${maxYear}.`);
  }

  // Fetch before touching the database, so a year upstream doesn't have yet
  // doesn't leave an empty season behind.
  const races = await fetchSeasonSchedule(year);

  if (races.length === 0) {
    throw new Error(`No races found for year ${year}`);
  }

  let season: Doc<"seasons"> | null = await ctx.runQuery(
    api.queries.seasons.getSeasonByYear,
    { year }
  );

  if (!season) {
    await ctx.runMutation(api.mutations.seasons.createSeason, {
      year,
      totalRaces: 0, // Will be updated after fetching races
      currentRound: 0,
    });
    season = await ctx.runQuery(api.queries.seasons.getSeasonByYear, {
      year,
    });
    if (!season) {
      throw new Error("Failed to create season");
    }
  }

  const existingRaces = await ctx.runQuery(api.queries.races.getRacesBySeason, {
    seasonId: season._id,
  });

  const plan = planScheduleSync(
    existingRaces.map((race) => ({
      ...race,
      hasResults: (race.officialResults?.positions.length ?? 0) > 0,
    })),
    races,
    Date.now(),
    // Keep the names users know. See ScheduleSyncOptions.
    { syncDisplayFields: false }
  );

  for (const name of plan.skipped) {
    console.warn(`Skipping race ${name}: no race date`);
  }

  for (const race of plan.creates) {
    await ctx.runMutation(api.mutations.races.createRace, {
      seasonId: season._id,
      ...race,
    });
  }

  for (const patch of plan.updates) {
    await ctx.runMutation(api.mutations.races.updateRaceFromSchedule, patch);
  }

  const scheduleState = async (
    raceId: Id<"races">,
    state: {
      status?: "scheduled" | "cancelled";
      missingFromScheduleSince?: number | null;
    }
  ) =>
    ctx.runMutation(internal.mutations.races.updateScheduleState, {
      raceId,
      ...state,
    });

  const now = Date.now();
  for (const raceId of plan.markMissing) {
    await scheduleState(raceId, { missingFromScheduleSince: now });
  }
  for (const raceId of plan.clearMissing) {
    await scheduleState(raceId, { missingFromScheduleSince: null });
  }
  for (const raceId of plan.cancels) {
    await scheduleState(raceId, { status: "cancelled" });
  }
  for (const raceId of plan.reinstates) {
    await scheduleState(raceId, { status: "scheduled" });
  }

  const byId = new Map(existingRaces.map((race) => [race._id, race]));
  const describe = (ids: Id<"races">[]) =>
    ids.map((id) => byId.get(id)?.name ?? id).join(", ");

  if (!plan.scheduleLooksComplete) {
    console.warn(
      `${year} calendar returned ${races.length} races, under half of the ` +
        `season's active races. Not cancelling anything this run.`
    );
  }
  if (
    plan.creates.length ||
    plan.updates.length ||
    plan.cancels.length ||
    plan.reinstates.length ||
    plan.markMissing.length
  ) {
    console.log(
      `${year} calendar sync: ` +
        [
          plan.creates.length &&
            `added ${plan.creates.map((r) => r.name).join(", ")}`,
          plan.updates.length &&
            `updated ${describe(plan.updates.map((p) => p.raceId))}`,
          plan.cancels.length && `cancelled ${describe(plan.cancels)}`,
          plan.reinstates.length && `reinstated ${describe(plan.reinstates)}`,
          plan.markMissing.length &&
            `missing upstream ${describe(plan.markMissing)}`,
        ]
          .filter(Boolean)
          .join("; ")
    );
  }

  // Update season with total races
  await ctx.runMutation(api.mutations.seasons.updateSeason, {
    seasonId: season._id,
    totalRaces: races.length,
    currentRound: 1,
  });

  return {
    seasonId: season._id,
    racesSynced: races.length,
    racesCreated: plan.creates.length,
    racesUpdated: plan.updates.length,
    racesCancelled: plan.cancels.length,
    racesReinstated: plan.reinstates.length,
    orphanedRaces: plan.stillMissing.map((raceId) => ({
      raceId,
      round: byId.get(raceId)?.round ?? 0,
      name: byId.get(raceId)?.name ?? raceId,
    })),
  };
}

/**
 * Sync a season's schedule (dates, circuits, session times) from Jolpica
 * Note: Driver/team info is fetched on-demand when needed for predictions/results
 */
export const syncSeasonFromF1Connect = action({
  args: {
    year: v.number(),
  },
  handler: async (ctx, args): Promise<SeasonSyncResult> =>
    syncSeason(ctx, args.year),
});

/**
 * Cron entry point (see crons.js). Keeps the current season in step with
 * Jolpica without anyone pressing Sync, so races added, moved or dropped
 * mid-season show up on their own.
 */
export const syncCurrentSeasonSchedule = internalAction({
  args: {},
  handler: async (ctx): Promise<SeasonSyncResult> =>
    syncSeason(ctx, new Date().getUTCFullYear()),
});

/**
 * Fetch official results for a race and store them on the race.
 * Endpoint: /{year}/{round}/results, with the round resolved from the live
 * calendar because upstream round numbers are not stable.
 */
export const updateRaceResultsFromF1Connect = action({
  args: {
    raceId: v.id("races"),
  },
  handler: async (ctx, args) => {
    const race = await ctx.runQuery(api.queries.races.getRaceById, {
      raceId: args.raceId,
    });

    if (!race) {
      throw new Error("Race not found");
    }

    const season = await ctx.runQuery(api.queries.seasons.getSeasonById, {
      seasonId: race.seasonId,
    });

    if (!season) {
      throw new Error("Season not found for race");
    }

    // Our stored rounds don't follow upstream's (we keep cancelled races and
    // put late additions at the end), so there is no safe fallback when the
    // calendar can't be fetched. Let the error through; the cron retries hourly.
    const schedule = await fetchSeasonSchedule(season.year);
    const scheduleEntry = matchScheduleEntry(race, schedule);

    if (!scheduleEntry) {
      throw new Error(
        `${race.name} is not on Jolpica's ${season.year} calendar ` +
          `(stored round ${race.round}, circuit "${race.circuit}"). ` +
          `Upstream dropped or renamed this race, so there are no results to sync. ` +
          `Re-sync the season schedule, or cancel the race in the room.`
      );
    }

    if (scheduleEntry.raceId && race.apiRaceId !== scheduleEntry.raceId) {
      // Remember the stable identifier so later syncs skip the circuit match.
      await ctx.runMutation(api.mutations.races.updateRaceFromSchedule, {
        raceId: race._id,
        apiRaceId: scheduleEntry.raceId,
      });
    }

    const apiRound = scheduleRound(scheduleEntry);
    if (apiRound <= 0) {
      throw new Error(`${race.name} has no round on Jolpica's calendar.`);
    }

    console.log(
      `Fetching results for ${race.name}: stored round ${race.round}, ` +
        `Jolpica round ${apiRound}, year ${season.year}`
    );

    const [resultsData, qualifyingData] = await Promise.all([
      jolpica(`${season.year}/${apiRound}/results`),
      jolpica(`${season.year}/${apiRound}/qualifying`).catch((error) => {
        console.warn(
          "Qualifying fetch failed, using grid slot 1 for pole",
          error
        );
        return null;
      }),
    ]);

    const resultRace = resultsData.RaceTable?.Races[0];
    const results = resultRace?.Results ?? [];

    if (!resultRace || results.length === 0) {
      throw new Error(
        `Results for ${race.name} are not on Jolpica yet (round ${apiRound}, ` +
          `${season.year}). They usually appear a few hours after the race.`
      );
    }

    // Results are fetched by round, so confirm the round still points at this
    // race before writing anything.
    const resultRaceId = toRaceData(resultRace).raceId;
    if (resultRaceId !== scheduleEntry.raceId) {
      throw new Error(
        `Jolpica round ${apiRound} returned ${resultRace.raceName} ` +
          `(${resultRaceId}), expected ${scheduleEntry.raceId}. ` +
          `Not updating ${race.name}.`
      );
    }

    const officialResults = parseOfficialResults(
      results,
      qualifyingData?.RaceTable?.Races[0]?.QualifyingResults
    );

    if (officialResults.positions.length === 0) {
      throw new Error("No classified finishers in Jolpica results.");
    }

    await ctx.runMutation(api.mutations.races.updateRaceResults, {
      raceId: args.raceId,
      officialResults,
    });

    return { raceId: args.raceId, resultsUpdated: true };
  },
});

type DriverSeasonCacheDoc = {
  drivers: SeasonDriverRow[];
  updatedAt: number;
} | null;

/**
 * Drivers and teams for a season, cached for 6 hours.
 *
 * Built from the driver standings, which list everyone who has raced this
 * season. A debutant appears after their first race. Before the season's
 * first race there are no standings, so fall back to the driver list, which
 * has no teams.
 */
export const getDriversForRace = action({
  args: {
    year: v.number(), // Season year (e.g. 2025, 2026)
  },
  handler: async (ctx, args): Promise<SeasonDriverRow[]> => {
    const year = args.year;
    const TTL_MS = 6 * 60 * 60 * 1000;
    const cached = (await ctx.runQuery(internal.driversCache.getByYear, {
      year,
    })) as DriverSeasonCacheDoc;
    if (cached && Date.now() - cached.updatedAt < TTL_MS) {
      return cached.drivers;
    }

    try {
      const standingsData = await jolpica(`${year}/driverstandings`);
      const standings =
        standingsData.StandingsTable?.StandingsLists[0]?.DriverStandings ?? [];

      const result =
        standings.length > 0
          ? driversFromStandings(standings)
          : driversFromDriverList(
              (await jolpica(`${year}/drivers`)).DriverTable?.Drivers ?? []
            );

      if (result.length > 0) {
        await ctx.runMutation(internal.driversCache.upsert, {
          year,
          drivers: result,
          updatedAt: Date.now(),
        });
      } else {
        console.warn(`No drivers with numbers found for ${year}`);
      }

      return result;
    } catch (err) {
      if (cached) {
        console.warn(
          "getDriversForRace: API error, returning stale cache",
          err
        );
        return cached.drivers;
      }
      throw err;
    }
  },
});
