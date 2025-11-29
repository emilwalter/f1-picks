"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";

const F1API_BASE_URL = "https://f1api.dev/api";

// Type definitions for F1 API responses
interface RaceData {
  raceId?: string;
  raceName?: string;
  round?: number;
  schedule?: {
    fp1?: { date?: string; time?: string };
    fp2?: { date?: string; time?: string };
    fp3?: { date?: string; time?: string };
    qualy?: { date?: string; time?: string };
    race?: { date?: string; time?: string };
  };
  circuit?: {
    circuitName?: string;
    city?: string;
    country?: string;
  };
  circuitName?: string;
  location?: string;
  country?: string;
}

interface DriverData {
  number?: number;
  driver_number?: number;
  driverNumber?: number;
  name?: string;
  firstName?: string;
  surname?: string;
  lastName?: string;
  last_name?: string;
  shortName?: string;
  nationality?: string;
  country_code?: string;
  countryCode?: string;
}

interface TeamData {
  teamId?: string;
  id?: string;
  slug?: string;
  teamName?: string;
  name?: string;
  team_name?: string;
  logo?: string;
}

interface TeamDriverItem {
  driver?: DriverData;
}

interface PositionData {
  driver_number: number;
  position: number;
}

interface LapData {
  lap_duration?: number;
  driver_number: number;
}

interface SessionData {
  session_key?: string;
  session_name?: string;
  date_start?: string;
  date_end?: string;
  meeting_key?: string;
}

/**
 * Get the next upcoming race from F1 API
 * Uses /current/next endpoint for efficient fetching
 */
export const getNextRace = action({
  args: {},
  handler: async (_ctx) => {
    const response = await fetch(`${F1API_BASE_URL}/current/next`);

    if (!response.ok) {
      throw new Error(`Failed to fetch next race: ${response.statusText}`);
    }

    const data = await response.json();

    // Extract race data from response
    if (data.race && data.race.length > 0) {
      const raceData = data.race[0];
      return {
        raceId: raceData.raceId,
        raceName: raceData.raceName,
        round: raceData.round,
        date: raceData.schedule?.race?.date,
        time: raceData.schedule?.race?.time,
        circuit: raceData.circuit?.circuitName,
        location: raceData.circuit?.city,
        country: raceData.circuit?.country,
        schedule: raceData.schedule,
      };
    }

    return null;
  },
});

/**
 * Sync season schedule from F1 API (f1api.dev)
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

    // Fetch races from f1api.dev - use /current for current season
    // Note: f1api.dev only supports current season via /current endpoint
    const currentYear = new Date().getFullYear();
    if (args.year !== currentYear && args.year !== 2025) {
      throw new Error(
        `f1api.dev only supports the current season (${currentYear} or 2025). Please use ${currentYear} or 2025.`,
      );
    }

    const racesResponse = await fetch(`${F1API_BASE_URL}/current`);

    if (!racesResponse.ok) {
      const errorText = await racesResponse.text();
      throw new Error(
        `Failed to fetch races: ${racesResponse.statusText}. Response: ${errorText.substring(0, 200)}`,
      );
    }

    const racesData = (await racesResponse.json()) as
      | { races?: RaceData[]; message?: string }
      | RaceData[];

    // f1api.dev /current endpoint returns an object with races array
    let races: RaceData[] = [];
    if (Array.isArray(racesData)) {
      races = racesData;
    } else if (!Array.isArray(racesData) && "races" in racesData) {
      if (racesData.races && Array.isArray(racesData.races)) {
        races = racesData.races;
      } else if (racesData.message) {
        // API returned an error message
        throw new Error(`API Error: ${racesData.message}`);
      } else {
        throw new Error(
          `Unexpected API response format. Got: ${JSON.stringify(racesData).substring(0, 200)}`,
        );
      }
    } else {
      throw new Error(
        `Unexpected API response format. Got: ${JSON.stringify(racesData).substring(0, 200)}`,
      );
    }

    if (races.length === 0) {
      throw new Error(`No races found for year ${args.year}`);
    }

    // Process each race
    for (const raceData of races) {
      // Extract race date from schedule
      const raceSchedule = raceData.schedule?.race;
      if (!raceSchedule || !raceSchedule.date) {
        console.warn(
          `Skipping race ${raceData.raceName || raceData.raceId}: no race date`,
        );
        continue;
      }

      // Parse race date (format: "2025-03-02")
      const raceDateStr = raceSchedule.date;
      const raceTimeStr = raceSchedule.time || "12:00:00Z";
      const raceDateTime = new Date(`${raceDateStr}T${raceTimeStr}`);
      const raceDate = raceDateTime.getTime();

      // Get circuit and location info
      const circuit =
        raceData.circuit?.circuitName || raceData.circuitName || "Unknown";
      const location = raceData.circuit?.city || raceData.location || "Unknown";
      const country =
        raceData.circuit?.country || raceData.country || "Unknown";

      // Extract session times from schedule
      let sessionTimes:
        | {
            fp1?: { start: number; end: number };
            fp2?: { start: number; end: number };
            fp3?: { start: number; end: number };
            qualifying?: { start: number; end: number };
            race?: { start: number; end: number };
          }
        | undefined = undefined;
      const schedule = raceData.schedule;
      if (schedule) {
        const parseSessionTime = (session?: {
          date?: string;
          time?: string;
        }) => {
          if (!session || !session.date || !session.time) return undefined;
          const start = new Date(`${session.date}T${session.time}`).getTime();
          // Estimate end time as 2 hours after start (adjust as needed)
          const end = start + 2 * 60 * 60 * 1000;
          return { start, end };
        };

        sessionTimes = {
          fp1: parseSessionTime(schedule.fp1),
          fp2: parseSessionTime(schedule.fp2),
          fp3: parseSessionTime(schedule.fp3),
          qualifying: parseSessionTime(schedule.qualy),
          race: parseSessionTime(schedule.race),
        };
      }

      const round = raceData.round || 1;
      const raceName = raceData.raceName || `Race ${round}`;

      // Check if race already exists
      const existingRace = await ctx.runQuery(
        api.queries.seasons.getRaceBySeasonRound,
        {
          seasonId: season._id,
          round,
        },
      );

      if (!existingRace) {
        // Create race
        await ctx.runMutation(api.mutations.races.createRace, {
          seasonId: season._id,
          round,
          name: raceName,
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
    }

    // Update season with total races
    await ctx.runMutation(api.mutations.seasons.updateSeason, {
      seasonId: season._id,
      totalRaces: races.length,
      currentRound: 1, // Could be calculated based on current date
    });

    return { seasonId: season._id, racesSynced: races.length };
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
      `${F1API_BASE_URL}/sessions?date=${raceDate}&session_type=Race`,
    );

    if (!sessionsResponse.ok) {
      throw new Error(
        `Failed to fetch race sessions: ${sessionsResponse.statusText}`,
      );
    }

    const sessions = (await sessionsResponse.json()) as SessionData[];
    if (sessions.length === 0) {
      throw new Error("No race session found for this date");
    }

    const sessionKey = sessions[0]?.session_key;
    if (!sessionKey) {
      throw new Error("No session key found");
    }

    // Fetch position data for the race
    const positionsResponse = await fetch(
      `${F1API_BASE_URL}/position?session_key=${sessionKey}`,
    );

    if (!positionsResponse.ok) {
      throw new Error(
        `Failed to fetch positions: ${positionsResponse.statusText}`,
      );
    }

    const positionsData = await positionsResponse.json();

    // Get final positions (last position for each driver)
    const finalPositions = new Map<number, number>();
    (positionsData as PositionData[]).forEach((pos) => {
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
      `${F1API_BASE_URL}/laps?session_key=${sessionKey}`,
    );
    let fastestLapDriverId: number | undefined;
    if (lapsResponse.ok) {
      const lapsData = (await lapsResponse.json()) as LapData[];
      // Find fastest lap
      let fastestTime = Infinity;
      lapsData.forEach((lap) => {
        if (lap.lap_duration && lap.lap_duration < fastestTime) {
          fastestTime = lap.lap_duration;
          fastestLapDriverId = lap.driver_number;
        }
      });
    }

    // Fetch pole position (from qualifying session)
    const qualifyingResponse = await fetch(
      `${F1API_BASE_URL}/sessions?date=${raceDate}&session_type=Qualifying`,
    );
    let polePositionDriverId: number | undefined;
    if (qualifyingResponse.ok) {
      const qualifyingData = (await qualifyingResponse.json()) as SessionData[];
      if (qualifyingData.length > 0) {
        const qualifyingSessionKey = qualifyingData[0]?.session_key;
        const qualifyingPositionsResponse = await fetch(
          `${F1API_BASE_URL}/position?session_key=${qualifyingSessionKey}`,
        );
        if (qualifyingPositionsResponse.ok) {
          const qualifyingPositions =
            (await qualifyingPositionsResponse.json()) as PositionData[];
          // Get first position (pole)
          const polePosition = qualifyingPositions.find(
            (p) => p.position === 1,
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
 * Get drivers for current season
 * Uses /current/drivers endpoint to get all drivers for the current season
 */
export const getDriversForRace = action({
  args: {
    date: v.optional(v.string()), // ISO date string (YYYY-MM-DD) - optional, not used but kept for compatibility
  },
  handler: async (_ctx, _args) => {
    // Determine the year to use (default to current year or 2025)
    const currentYear = new Date().getFullYear();
    const year = currentYear >= 2025 ? 2025 : currentYear;

    // Fetch current season drivers and teams in parallel
    const [driversResponse, teamsResponse] = await Promise.all([
      fetch(`${F1API_BASE_URL}/current/drivers`),
      fetch(`${F1API_BASE_URL}/${year}/teams`).catch(() => null),
    ]);

    if (!driversResponse.ok) {
      const errorText = await driversResponse.text().catch(() => "");
      throw new Error(
        `Failed to fetch drivers: ${driversResponse.status} ${driversResponse.statusText}. ${errorText.substring(0, 200)}`,
      );
    }

    const driversData = (await driversResponse.json()) as
      | DriverData[]
      | { drivers?: DriverData[]; driver?: DriverData[] };

    // Handle response format: {drivers: [...]} or {driver: [...]}
    let drivers: DriverData[] = [];
    if (Array.isArray(driversData)) {
      drivers = driversData;
    } else if (driversData.drivers && Array.isArray(driversData.drivers)) {
      drivers = driversData.drivers;
    } else if (driversData.driver && Array.isArray(driversData.driver)) {
      drivers = driversData.driver;
    } else {
      console.warn(
        "Unexpected drivers response format:",
        JSON.stringify(driversData).substring(0, 500),
      );
      drivers = [];
    }

    // Build driver-to-team mapping using year-specific team endpoints
    const teamMap: Map<number, { name: string; logo?: string }> = new Map();

    // Known team names that work with the API (fallback if teams endpoint doesn't work)
    const knownTeamNames = [
      "mercedes",
      "ferrari",
      "red-bull-racing",
      "mclaren",
      "aston-martin",
      "alpine",
      "williams",
      "alphatauri",
      "alfa-romeo",
      "haas",
    ];

    if (teamsResponse && teamsResponse.ok) {
      const teamsData = (await teamsResponse.json()) as
        | TeamData[]
        | { teams?: TeamData[]; team?: TeamData[] };
      // Handle both array and object with teams array
      let teams: TeamData[] = [];
      if (Array.isArray(teamsData)) {
        teams = teamsData;
      } else if (teamsData.teams && Array.isArray(teamsData.teams)) {
        teams = teamsData.teams;
      } else if (teamsData.team && Array.isArray(teamsData.team)) {
        teams = teamsData.team;
      }

      console.log(`Found ${teams.length} teams from API`);
      if (teams.length > 0) {
        console.log(
          `Sample team data:`,
          JSON.stringify(teams[0]).substring(0, 200),
        );
      }

      // Fetch drivers for each team using /{year}/teams/{teamId}/drivers endpoint
      const teamDriverPromises = teams.map(async (team) => {
        // Get teamId - this is what the API uses in URLs (e.g., "mercedes")
        const teamId = team.teamId || team.id || team.slug;
        // Get team display name (will be updated from API if available)
        let teamName = team.teamName || team.name || team.team_name || teamId;

        if (!teamId) {
          return null;
        }

        try {
          // Use teamId directly in the URL (API expects it as-is, e.g., "mercedes")
          const teamSlug = String(teamId).toLowerCase();

          const [teamInfoResponse, teamDriversResponse] = await Promise.all([
            fetch(`${F1API_BASE_URL}/${year}/teams/${teamSlug}`).catch(
              () => null,
            ),
            fetch(`${F1API_BASE_URL}/${year}/teams/${teamSlug}/drivers`).catch(
              () => null,
            ),
          ]);

          let teamLogo: string | undefined = team.logo;
          if (teamInfoResponse && teamInfoResponse.ok) {
            const teamInfo = (await teamInfoResponse.json()) as
              | TeamData
              | { team?: TeamData[] };
            // Handle team info response format: { team: [{ teamName: "...", ... }] }
            const teamData = (
              Array.isArray(teamInfo)
                ? teamInfo[0]
                : "team" in teamInfo && Array.isArray(teamInfo.team)
                  ? teamInfo.team[0]
                  : teamInfo
            ) as TeamData;
            teamLogo =
              teamData.logo || (teamInfo as TeamData).logo || team.logo;
            // Update teamName from API if available
            if (teamData.teamName || (teamInfo as TeamData).teamName) {
              teamName =
                teamData.teamName ||
                (teamInfo as TeamData).teamName ||
                teamName;
            }
          }

          let driversList: TeamDriverItem[] = [];
          if (teamDriversResponse && teamDriversResponse.ok) {
            const teamDriversData = (await teamDriversResponse.json()) as
              | TeamDriverItem[]
              | { drivers?: TeamDriverItem[] };
            // API returns { drivers: [{ driver: {...} }] }
            if (
              !Array.isArray(teamDriversData) &&
              "drivers" in teamDriversData &&
              Array.isArray(teamDriversData.drivers)
            ) {
              driversList = teamDriversData.drivers;
            } else if (Array.isArray(teamDriversData)) {
              driversList = teamDriversData;
            }
          }

          // Extract driver numbers from the drivers array
          // Each item has format: { driver: { number: 44, ... } }
          const driverNumbers = driversList
            .map((item) => {
              const driver = item.driver || item;
              return (
                (driver as DriverData).number ||
                (driver as DriverData).driverNumber ||
                (driver as DriverData).driver_number
              );
            })
            .filter((n): n is number => typeof n === "number");

          if (driverNumbers.length > 0) {
            return {
              teamName,
              teamLogo,
              driverNumbers,
            };
          } else {
            console.warn(
              `No drivers found for team ${teamName} (teamId: ${teamId})`,
            );
          }
        } catch (err) {
          console.warn(
            `Failed to fetch drivers for team ${teamName} (teamId: ${teamId}):`,
            err,
          );
        }
        return null;
      });

      const teamDriverMappings = await Promise.all(teamDriverPromises);
      const successfulMappings = teamDriverMappings.filter(
        (
          m,
        ): m is {
          teamName: string;
          teamLogo: string | undefined;
          driverNumbers: number[];
        } =>
          m !== null &&
          m.teamName !== undefined &&
          typeof m.teamName === "string",
      );

      console.log(
        `Successfully mapped ${successfulMappings.length} teams out of ${teams.length}`,
      );

      successfulMappings.forEach((mapping) => {
        const teamName: string = mapping.teamName;
        mapping.driverNumbers.forEach((driverNumber: number) => {
          if (driverNumber) {
            teamMap.set(driverNumber, {
              name: teamName,
              logo: mapping.teamLogo,
            });
          }
        });
      });

      // If we didn't get enough mappings, try fallback with known team names
      if (
        successfulMappings.length === 0 ||
        teamMap.size < drivers.length * 0.5
      ) {
        console.log("Using fallback: fetching drivers for known team names");
        const fallbackPromises = knownTeamNames.map(
          async (teamSlug: string) => {
            try {
              const [teamInfoResponse, teamDriversResponse] = await Promise.all(
                [
                  fetch(`${F1API_BASE_URL}/${year}/teams/${teamSlug}`).catch(
                    () => null,
                  ),
                  fetch(
                    `${F1API_BASE_URL}/${year}/teams/${teamSlug}/drivers`,
                  ).catch(() => null),
                ],
              );

              let teamLogo: string | undefined;
              let teamDisplayName = teamSlug
                .replace(/-/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase());

              if (teamInfoResponse && teamInfoResponse.ok) {
                const teamInfo = (await teamInfoResponse.json()) as
                  | TeamData
                  | { team?: TeamData[] };
                // Handle team info response format: { team: [{ teamName: "...", ... }] }
                const teamData = (
                  Array.isArray(teamInfo)
                    ? teamInfo[0]
                    : "team" in teamInfo && Array.isArray(teamInfo.team)
                      ? teamInfo.team[0]
                      : teamInfo
                ) as TeamData;
                teamLogo = teamData.logo || (teamInfo as TeamData).logo;
                teamDisplayName =
                  teamData.teamName ||
                  (teamInfo as TeamData).teamName ||
                  teamData.name ||
                  (teamInfo as TeamData).name ||
                  teamDisplayName;
              }

              if (teamDriversResponse && teamDriversResponse.ok) {
                const teamDriversData = (await teamDriversResponse.json()) as
                  | TeamDriverItem[]
                  | { drivers?: TeamDriverItem[] };
                // API returns { drivers: [{ driver: {...} }] }
                let driversList: TeamDriverItem[] = [];
                if (
                  !Array.isArray(teamDriversData) &&
                  "drivers" in teamDriversData &&
                  Array.isArray(teamDriversData.drivers)
                ) {
                  driversList = teamDriversData.drivers;
                } else if (Array.isArray(teamDriversData)) {
                  driversList = teamDriversData;
                }

                // Extract driver numbers from the drivers array
                // Each item has format: { driver: { number: 44, ... } }
                const driverNumbers = driversList
                  .map((item) => {
                    const driver = item.driver || item;
                    return (
                      (driver as DriverData).number ||
                      (driver as DriverData).driverNumber ||
                      (driver as DriverData).driver_number
                    );
                  })
                  .filter((n): n is number => typeof n === "number");

                if (driverNumbers.length > 0) {
                  return {
                    teamName: teamDisplayName,
                    teamLogo,
                    driverNumbers,
                  };
                }
              }
            } catch {
              // Silently continue
            }
            return null;
          },
        );

        const fallbackMappings = await Promise.all(fallbackPromises);
        fallbackMappings.forEach((mapping) => {
          if (mapping) {
            mapping.driverNumbers.forEach((driverNumber: number) => {
              if (driverNumber && !teamMap.has(driverNumber)) {
                teamMap.set(driverNumber, {
                  name: mapping.teamName,
                  logo: mapping.teamLogo,
                });
              }
            });
          }
        });

        console.log(`Fallback mapped ${teamMap.size} drivers to teams`);
      }
    } else {
      console.warn(
        `Teams endpoint failed: ${teamsResponse?.status || "no response"}, using fallback`,
      );

      // Use fallback immediately if teams endpoint failed
      const fallbackPromises = knownTeamNames.map(async (teamSlug) => {
        try {
          const [teamInfoResponse, teamDriversResponse] = await Promise.all([
            fetch(`${F1API_BASE_URL}/${year}/teams/${teamSlug}`).catch(
              () => null,
            ),
            fetch(`${F1API_BASE_URL}/${year}/teams/${teamSlug}/drivers`).catch(
              () => null,
            ),
          ]);

          let teamLogo: string | undefined;
          let teamDisplayName = teamSlug
            .replace(/-/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase());

          if (teamInfoResponse && teamInfoResponse.ok) {
            const teamInfo = (await teamInfoResponse.json()) as
              | TeamData
              | { team?: TeamData[] };
            // Handle team info response format: { team: [{ teamName: "...", ... }] }
            const teamData = (
              Array.isArray(teamInfo)
                ? teamInfo[0]
                : "team" in teamInfo && Array.isArray(teamInfo.team)
                  ? teamInfo.team[0]
                  : teamInfo
            ) as TeamData;
            teamLogo = teamData.logo || (teamInfo as TeamData).logo;
            teamDisplayName =
              teamData.teamName ||
              (teamInfo as TeamData).teamName ||
              teamData.name ||
              (teamInfo as TeamData).name ||
              teamDisplayName;
          }

          if (teamDriversResponse && teamDriversResponse.ok) {
            const teamDriversData = (await teamDriversResponse.json()) as
              | TeamDriverItem[]
              | { drivers?: TeamDriverItem[] };
            // API returns { drivers: [{ driver: {...} }] }
            let driversList: TeamDriverItem[] = [];
            if (
              !Array.isArray(teamDriversData) &&
              "drivers" in teamDriversData &&
              Array.isArray(teamDriversData.drivers)
            ) {
              driversList = teamDriversData.drivers;
            } else if (Array.isArray(teamDriversData)) {
              driversList = teamDriversData;
            }

            // Extract driver numbers from the drivers array
            // Each item has format: { driver: { number: 44, ... } }
            const driverNumbers = driversList
              .map((item) => {
                const driver = item.driver || item;
                return (
                  (driver as DriverData).number ||
                  (driver as DriverData).driverNumber ||
                  (driver as DriverData).driver_number
                );
              })
              .filter((n): n is number => typeof n === "number");

            if (driverNumbers.length > 0) {
              return {
                teamName: teamDisplayName,
                teamLogo,
                driverNumbers,
              };
            }
          }
        } catch {
          // Silently continue
        }
        return null;
      });

      const fallbackMappings = await Promise.all(fallbackPromises);
      fallbackMappings.forEach((mapping) => {
        if (mapping) {
          mapping.driverNumbers.forEach((driverNumber: number) => {
            if (driverNumber) {
              teamMap.set(driverNumber, {
                name: mapping.teamName,
                logo: mapping.teamLogo,
              });
            }
          });
        }
      });

      console.log(`Fallback mapped ${teamMap.size} drivers to teams`);
    }

    // Return formatted driver data with team information
    if (!Array.isArray(drivers) || drivers.length === 0) {
      console.warn(
        `No drivers found. Response data:`,
        JSON.stringify(driversData).substring(0, 500),
      );
      return [];
    }

    return drivers
      .map((driver) => {
        // Handle different API response formats
        const driverNumber =
          driver.number || driver.driver_number || driver.driverNumber;
        if (!driverNumber) {
          return null;
        }
        const firstName = driver.name || driver.firstName || "";
        const lastName =
          driver.surname || driver.lastName || driver.last_name || "";
        const fullName =
          `${firstName} ${lastName}`.trim() ||
          driver.shortName ||
          `Driver ${driverNumber}`;

        // Get team from API mapping
        const teamInfo = teamMap.get(driverNumber);
        const teamName = teamInfo?.name || "Unknown Team";
        const teamLogo = teamInfo?.logo;

        const countryCode =
          driver.nationality || driver.country_code || driver.countryCode || "";

        return {
          driverNumber,
          name: fullName,
          teamName,
          teamLogo,
          countryCode,
        };
      })
      .filter(
        (driver): driver is NonNullable<typeof driver> => driver !== null,
      );
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
      `${F1API_BASE_URL}/sessions?session_key=${args.sessionKey}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch session data: ${response.statusText}`);
    }

    const data = (await response.json()) as unknown[];
    return (data[0] as unknown) || null;
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
        `${F1API_BASE_URL}/laps?session_key=${args.sessionKey}&driver_number=${args.driverNumber}`,
      ).then((r) => (r.ok ? r.json() : [])),
      fetch(
        `${F1API_BASE_URL}/position?session_key=${args.sessionKey}&driver_number=${args.driverNumber}`,
      ).then((r) => (r.ok ? r.json() : [])),
      fetch(
        `${F1API_BASE_URL}/car_data?session_key=${args.sessionKey}&driver_number=${args.driverNumber}`,
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
  sessions: SessionData[],
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
  ): Promise<{ raceId: Id<"races">; sessionTimesUpdated: boolean }> => {
    const race = await ctx.runQuery(api.queries.races.getRaceById, {
      raceId: args.raceId,
    });

    if (!race) {
      throw new Error("Race not found");
    }

    // Get meeting key from race date
    const raceDate = new Date(race.date).toISOString().split("T")[0];
    const sessionsResponse = await fetch(
      `${F1API_BASE_URL}/sessions?date=${raceDate}`,
    );

    if (!sessionsResponse.ok) {
      throw new Error(
        `Failed to fetch sessions: ${sessionsResponse.statusText}`,
      );
    }

    const sessions = (await sessionsResponse.json()) as SessionData[];
    if (sessions.length === 0) {
      throw new Error("No sessions found for this race date");
    }

    // Group by meeting_key to get all sessions for this race
    const meetingKey = sessions[0]?.meeting_key;
    if (!meetingKey) {
      throw new Error("No meeting key found");
    }
    const allSessionsResponse = await fetch(
      `${F1API_BASE_URL}/sessions?meeting_key=${meetingKey}`,
    );

    if (!allSessionsResponse.ok) {
      throw new Error(
        `Failed to fetch all sessions: ${allSessionsResponse.statusText}`,
      );
    }

    const allSessions = (await allSessionsResponse.json()) as SessionData[];
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
