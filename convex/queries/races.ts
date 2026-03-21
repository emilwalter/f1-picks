import { query, type QueryCtx } from "../_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";

async function raceWithSeasonYear(
  ctx: QueryCtx,
  race: Doc<"races">
): Promise<Doc<"races"> & { seasonYear: number }> {
  const season = await ctx.db.get(race.seasonId);
  return { ...race, seasonYear: season?.year ?? 0 };
}

/**
 * Get upcoming races (races with date >= current time)
 * Ordered by date ascending
 */
export const getUpcomingRaces = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const races = await ctx.db
      .query("races")
      .withIndex("by_date", (q) => q.gte("date", now))
      .order("asc")
      .collect();

    // Apply limit if provided
    const slice = args.limit ? races.slice(0, args.limit) : races;
    return await Promise.all(slice.map((r) => raceWithSeasonYear(ctx, r)));
  },
});

/**
 * Get a race by ID
 */
export const getRaceById = query({
  args: {
    raceId: v.id("races"),
  },
  handler: async (ctx, args) => {
    const race = await ctx.db.get(args.raceId);
    if (!race) return null;
    return await raceWithSeasonYear(ctx, race);
  },
});

/**
 * Get races for a specific season
 */
export const getRacesBySeason = query({
  args: {
    seasonId: v.id("seasons"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("races")
      .withIndex("by_season", (q) => q.eq("seasonId", args.seasonId))
      .order("asc")
      .collect();
  },
});

/**
 * Get the current season
 */
export const getCurrentSeason = query({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const currentYear = now.getFullYear();

    const season = await ctx.db
      .query("seasons")
      .withIndex("by_year", (q) => q.eq("year", currentYear))
      .first();

    return season;
  },
});

/**
 * Get completed races that don't have results yet
 * Used by scheduled functions to sync results
 */
export const getCompletedRacesWithoutResults = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    // Get races that have passed (date < now) but don't have officialResults
    const races = await ctx.db
      .query("races")
      .withIndex("by_date", (q) => q.lt("date", now))
      .collect();

    // Filter to only races without results
    return races.filter((race) => !race.officialResults);
  },
});

/**
 * Get completed races that have results but may need score recalculation
 * Used by scheduled functions to ensure scores are up to date
 */
export const getCompletedRacesWithResults = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    // Get races that have passed (date < now) and have officialResults
    const races = await ctx.db
      .query("races")
      .withIndex("by_date", (q) => q.lt("date", now))
      .collect();

    // Filter to only races with results
    return races.filter((race) => !!race.officialResults);
  },
});

/**
 * Past races for a season that have synced official results (for results index UI).
 * Newest first by race date.
 */
export const getSeasonRacesWithOfficialResults = query({
  args: {
    seasonId: v.id("seasons"),
  },
  handler: async (ctx, args) => {
    const races = await ctx.db
      .query("races")
      .withIndex("by_season", (q) => q.eq("seasonId", args.seasonId))
      .collect();

    return races
      .filter((r) => r.officialResults !== undefined)
      .sort((a, b) => b.date - a.date);
  },
});

/**
 * Most recent completed race with official results across the user's active rooms.
 * One dashboard row: picks globally latest by date among all rooms the user is in.
 */
export const getDashboardLatestCompletedRace = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const participants = await ctx.db
      .query("roomParticipants")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const rooms = await Promise.all(
      participants.map((p) => ctx.db.get(p.roomId))
    );

    const activeRooms = rooms.filter(
      (room): room is Doc<"rooms"> => !!room && room.status === "open"
    );

    let best: {
      date: number;
      roomId: Id<"rooms">;
      roomName: string | undefined;
      race: Doc<"races">;
    } | null = null;

    for (const room of activeRooms) {
      const races = await ctx.db
        .query("races")
        .withIndex("by_season", (q) => q.eq("seasonId", room.seasonId))
        .collect();

      for (const race of races) {
        if (!race.officialResults) continue;
        if (!best || race.date > best.date) {
          best = {
            date: race.date,
            roomId: room._id,
            roomName: room.name,
            race,
          };
        }
      }
    }

    if (!best) return null;

    const season = await ctx.db.get(best.race.seasonId);

    return {
      roomId: best.roomId,
      roomName: best.roomName ?? null,
      raceId: best.race._id,
      raceName: best.race.name,
      circuit: best.race.circuit,
      date: best.race.date,
      round: best.race.round,
      seasonYear: season?.year ?? 0,
    };
  },
});
