"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

const OPENF1_BASE_URL = "https://api.openf1.org/v1";

/**
 * Sync season schedule from Open F1 API
 * Fetches race schedule (dates, circuits, locations) for a given year
 * Note: Driver/team info is fetched on-demand when needed for predictions/results
 */
export const syncSeasonFromOpenF1 = action({
  args: {
    year: v.number(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ seasonId: Id<"seasons">; racesSynced: number }> => {
    // Get or create season
    let season: Doc<"seasons"> | null = await ctx.runQuery(
      api.queries.seasons.getSeasonByYear,
      {
        year: args.year,
      },
    );

    if (!season) {
      // Create season via mutation
      const seasonId = await ctx.runMutation(
        api.mutations.seasons.createSeason,
        {
          year: args.year,
          totalRaces: 0, // Will be updated after fetching races
          currentRound: 0,
        },
      );
      // Fetch the created season
      season = await ctx.runQuery(api.queries.seasons.getSeasonByYear, {
        year: args.year,
      });
      if (!season) {
        throw new Error("Failed to create season");
      }
    }

    // Fetch race sessions for the year
    const sessionsResponse = await fetch(
      `${OPENF1_BASE_URL}/sessions?year=${args.year}&session_type=Race`,
    );
    if (!sessionsResponse.ok) {
      throw new Error(
        `Failed to fetch sessions: ${sessionsResponse.statusText}`,
      );
    }
    const sessions = await sessionsResponse.json();

    // Group sessions by race (using meeting_key)
    const racesByMeeting = new Map<string, any[]>();
    sessions.forEach((session: any) => {
      const meetingKey = session.meeting_key;
      if (!racesByMeeting.has(meetingKey)) {
        racesByMeeting.set(meetingKey, []);
      }
      racesByMeeting.get(meetingKey)!.push(session);
    });

    // Process each race
    let round = 1;
    for (const [meetingKey, raceSessions] of racesByMeeting) {
      const raceSession = raceSessions[0]; // Use first race session
      const raceDate = new Date(raceSession.date_start).getTime();

      // Get circuit and location info from session
      const circuit = raceSession.circuit_short_name || "Unknown";
      const location = raceSession.location || "Unknown";
      const country = raceSession.country_code || "Unknown";

      // Fetch all sessions for this meeting to get session times
      const meetingDate = raceSession.date_start.split("T")[0];
      const allSessionsResponse = await fetch(
        `${OPENF1_BASE_URL}/sessions?meeting_key=${meetingKey}`,
      );
      let sessionTimes: any = undefined;
      if (allSessionsResponse.ok) {
        const allSessions = await allSessionsResponse.json();
        sessionTimes = {
          fp1: extractSessionTime(allSessions, "FP1"),
          fp2: extractSessionTime(allSessions, "FP2"),
          fp3: extractSessionTime(allSessions, "FP3"),
          qualifying: extractSessionTime(allSessions, "Qualifying"),
          race: extractSessionTime(allSessions, "Race"),
        };
      }

      // Check if race already exists
      const existingRace = await ctx.runQuery(
        api.queries.seasons.getRaceBySeasonRound,
        {
          seasonId: season._id,
          round,
        },
      );

      if (!existingRace) {
        // Create race (without driver/team data - fetched on-demand)
        await ctx.runMutation(api.mutations.races.createRace, {
          seasonId: season._id,
          round,
          name: raceSession.meeting_name || `Race ${round}`,
          date: raceDate,
          circuit,
          location,
          country,
          sessionTimes,
        });
      } else {
        // Update existing race with session times if not already set
        if (sessionTimes && !existingRace.sessionTimes) {
          await ctx.runMutation(api.mutations.races.updateSessionTimes, {
            raceId: existingRace._id,
            sessionTimes,
          });
        }
      }

      round++;
    }

    // Update season with total races
    await ctx.runMutation(api.mutations.seasons.updateSeason, {
      seasonId: season._id,
      totalRaces: racesByMeeting.size,
      currentRound: 1, // Could be calculated based on current date
    });

    return { seasonId: season._id, racesSynced: racesByMeeting.size };
  },
});

/**
 * Update race results from Open F1 API
 */
export const updateRaceResultsFromOpenF1 = action({
  args: {
    raceId: v.id("races"),
  },
  handler: async (ctx, args) => {
    // Get race
    const race = await ctx.runQuery(api.queries.races.getRaceById, {
      raceId: args.raceId,
    });

    if (!race) {
      throw new Error("Race not found");
    }

    // Get session key for the race (we'd need to store this or derive it)
    // For now, we'll use the date to find sessions
    const raceDate = new Date(race.date).toISOString().split("T")[0];
    const sessionsResponse = await fetch(
      `${OPENF1_BASE_URL}/sessions?date=${raceDate}&session_type=Race`,
    );

    if (!sessionsResponse.ok) {
      throw new Error(
        `Failed to fetch race sessions: ${sessionsResponse.statusText}`,
      );
    }

    const sessions = await sessionsResponse.json();
    if (sessions.length === 0) {
      throw new Error("No race session found for this date");
    }

    const sessionKey = sessions[0].session_key;

    // Fetch position data for the race
    const positionsResponse = await fetch(
      `${OPENF1_BASE_URL}/position?session_key=${sessionKey}`,
    );

    if (!positionsResponse.ok) {
      throw new Error(
        `Failed to fetch positions: ${positionsResponse.statusText}`,
      );
    }

    const positionsData = await positionsResponse.json();

    // Get final positions (last position for each driver)
    const finalPositions = new Map<number, number>();
    positionsData.forEach((pos: any) => {
      finalPositions.set(pos.driver_number, pos.position);
    });

    // Convert to sorted array
    const sortedPositions = Array.from(finalPositions.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([driverNumber, position], index) => ({
        position: position,
        driverNumber,
        points: calculatePoints(position), // Standard F1 points system
      }));

    // Fetch fastest lap (from lap times)
    const lapsResponse = await fetch(
      `${OPENF1_BASE_URL}/laps?session_key=${sessionKey}`,
    );
    let fastestLapDriverId: number | undefined;
    if (lapsResponse.ok) {
      const lapsData = await lapsResponse.json();
      // Find fastest lap
      let fastestTime = Infinity;
      lapsData.forEach((lap: any) => {
        if (lap.lap_duration && lap.lap_duration < fastestTime) {
          fastestTime = lap.lap_duration;
          fastestLapDriverId = lap.driver_number;
        }
      });
    }

    // Fetch pole position (from qualifying session)
    const qualifyingResponse = await fetch(
      `${OPENF1_BASE_URL}/sessions?date=${raceDate}&session_type=Qualifying`,
    );
    let polePositionDriverId: number | undefined;
    if (qualifyingResponse.ok) {
      const qualifyingData = await qualifyingResponse.json();
      if (qualifyingData.length > 0) {
        const qualifyingSessionKey = qualifyingData[0].session_key;
        const qualifyingPositionsResponse = await fetch(
          `${OPENF1_BASE_URL}/position?session_key=${qualifyingSessionKey}`,
        );
        if (qualifyingPositionsResponse.ok) {
          const qualifyingPositions = await qualifyingPositionsResponse.json();
          // Get first position (pole)
          const polePosition = qualifyingPositions.find(
            (p: any) => p.position === 1,
          );
          if (polePosition) {
            polePositionDriverId = polePosition.driver_number;
          }
        }
      }
    }

    // Fetch DNF drivers (drivers who didn't finish - would need to check stints or final positions)
    // This is simplified - in reality, you'd check if a driver's final position is null or if they have no stints
    const dnfDriverIds: number[] = [];

    // Update race with results
    await ctx.runMutation(api.mutations.races.updateRaceResults, {
      raceId: args.raceId,
      officialResults: {
        positions: sortedPositions,
        fastestLapDriverId,
        polePositionDriverId,
        dnfDriverIds,
      },
    });

    return { raceId: args.raceId, resultsUpdated: true };
  },
});

/**
 * Get drivers for a specific race/date
 * Used for prediction forms and displaying driver info
 */
export const getDriversForRace = action({
  args: {
    date: v.string(), // ISO date string (YYYY-MM-DD)
  },
  handler: async (ctx, args) => {
    // Fetch drivers for the race date
    const driversResponse = await fetch(
      `${OPENF1_BASE_URL}/drivers?date=${args.date}`,
    );

    if (!driversResponse.ok) {
      throw new Error(`Failed to fetch drivers: ${driversResponse.statusText}`);
    }

    const drivers = await driversResponse.json();

    // Return formatted driver data
    return drivers.map((driver: any) => ({
      driverNumber: driver.driver_number,
      name: `${driver.name_acronym || ""} ${driver.last_name || ""}`.trim(),
      teamName: driver.session_key ? "Unknown" : "Unknown", // Teams need separate fetch
      countryCode: driver.country_code || "",
    }));
  },
});

/**
 * Get session data (practice, qualifying, race)
 */
export const getSessionData = action({
  args: {
    sessionKey: v.string(),
  },
  handler: async (ctx, args) => {
    const response = await fetch(
      `${OPENF1_BASE_URL}/sessions?session_key=${args.sessionKey}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch session data: ${response.statusText}`);
    }

    const data = await response.json();
    return data[0] || null;
  },
});

/**
 * Get driver-specific data for a session
 */
export const getDriverData = action({
  args: {
    driverNumber: v.number(),
    sessionKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Fetch multiple endpoints for comprehensive driver data
    const [laps, positions, carData] = await Promise.all([
      fetch(
        `${OPENF1_BASE_URL}/laps?session_key=${args.sessionKey}&driver_number=${args.driverNumber}`,
      ).then((r) => (r.ok ? r.json() : [])),
      fetch(
        `${OPENF1_BASE_URL}/position?session_key=${args.sessionKey}&driver_number=${args.driverNumber}`,
      ).then((r) => (r.ok ? r.json() : [])),
      fetch(
        `${OPENF1_BASE_URL}/car_data?session_key=${args.sessionKey}&driver_number=${args.driverNumber}`,
      ).then((r) => (r.ok ? r.json() : [])),
    ]);

    return {
      driverNumber: args.driverNumber,
      sessionKey: args.sessionKey,
      laps,
      positions,
      carData,
    };
  },
});

/**
 * Extract session start/end times from OpenF1 session data
 */
function extractSessionTime(
  sessions: any[],
  sessionType: string,
): { start: number; end: number } | undefined {
  const session = sessions.find((s) => s.session_name === sessionType);
  if (!session || !session.date_start || !session.date_end) {
    return undefined;
  }
  return {
    start: new Date(session.date_start).getTime(),
    end: new Date(session.date_end).getTime(),
  };
}

/**
 * Sync session times for a specific race
 * Useful for updating session times if they weren't available during initial sync
 */
export const syncRaceSessionTimes = action({
  args: {
    raceId: v.id("races"),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ raceId: string; sessionTimesUpdated: boolean }> => {
    const race = await ctx.runQuery(api.queries.races.getRaceById, {
      raceId: args.raceId,
    });

    if (!race) {
      throw new Error("Race not found");
    }

    // Get meeting key from race date
    const raceDate = new Date(race.date).toISOString().split("T")[0];
    const sessionsResponse = await fetch(
      `${OPENF1_BASE_URL}/sessions?date=${raceDate}`,
    );

    if (!sessionsResponse.ok) {
      throw new Error(
        `Failed to fetch sessions: ${sessionsResponse.statusText}`,
      );
    }

    const sessions = await sessionsResponse.json();
    if (sessions.length === 0) {
      throw new Error("No sessions found for this race date");
    }

    // Group by meeting_key to get all sessions for this race
    const meetingKey = sessions[0].meeting_key;
    const allSessionsResponse = await fetch(
      `${OPENF1_BASE_URL}/sessions?meeting_key=${meetingKey}`,
    );

    if (!allSessionsResponse.ok) {
      throw new Error(
        `Failed to fetch all sessions: ${allSessionsResponse.statusText}`,
      );
    }

    const allSessions = await allSessionsResponse.json();
    const sessionTimes = {
      fp1: extractSessionTime(allSessions, "FP1"),
      fp2: extractSessionTime(allSessions, "FP2"),
      fp3: extractSessionTime(allSessions, "FP3"),
      qualifying: extractSessionTime(allSessions, "Qualifying"),
      race: extractSessionTime(allSessions, "Race"),
    };

    await ctx.runMutation(api.mutations.races.updateSessionTimes, {
      raceId: args.raceId,
      sessionTimes,
    });

    return { raceId: args.raceId, sessionTimesUpdated: true };
  },
});

/**
 * Calculate F1 points based on position (standard F1 scoring)
 */
function calculatePoints(position: number): number {
  const pointsMap: Record<number, number> = {
    1: 25,
    2: 18,
    3: 15,
    4: 12,
    5: 10,
    6: 8,
    7: 6,
    8: 4,
    9: 2,
    10: 1,
  };
  return pointsMap[position] || 0;
}
