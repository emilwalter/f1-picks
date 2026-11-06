/**
 * Jolpica F1 (https://github.com/jolpica/jolpica-f1), the community successor
 * to the Ergast API. We moved here from f1api.dev in November 2026 after
 * f1api.dev's hosting was disabled (https://github.com/Rafacv23/F1-api/issues/52).
 *
 * Pure functions only (no network), so the parsing rules can be unit tested.
 * actions/f1Connect does the fetching.
 */
import type { RaceData } from "./scheduleSync";

export const JOLPICA_BASE_URL = "https://api.jolpi.ca/ergast/f1";

/** Jolpica pages its responses; 100 is the largest page it serves. */
export const JOLPICA_PAGE_LIMIT = 100;

export interface JolpicaSession {
  date?: string;
  time?: string;
}

export interface JolpicaRace {
  season: string;
  round: string;
  raceName: string;
  Circuit: {
    circuitId: string;
    circuitName: string;
    Location?: { locality?: string; country?: string };
  };
  date?: string;
  time?: string;
  FirstPractice?: JolpicaSession;
  SecondPractice?: JolpicaSession;
  ThirdPractice?: JolpicaSession;
  Qualifying?: JolpicaSession;
  Sprint?: JolpicaSession;
  SprintQualifying?: JolpicaSession;
}

export interface JolpicaDriver {
  driverId: string;
  permanentNumber?: string;
  code?: string;
  givenName: string;
  familyName: string;
  nationality?: string;
}

export interface JolpicaConstructor {
  constructorId: string;
  name: string;
}

export interface JolpicaResult {
  /** Car number for this race. */
  number: string;
  /** Numeric when classified; otherwise R, D, E, W, F or N. */
  positionText: string;
  points: string;
  /** "0" means a pit lane start. */
  grid: string;
  status: string;
  Driver: JolpicaDriver;
  Constructor: JolpicaConstructor;
  FastestLap?: { rank?: string };
}

export interface JolpicaQualifyingResult {
  number: string;
  position: string;
  Driver: JolpicaDriver;
}

export interface JolpicaDriverStanding {
  Driver: JolpicaDriver;
  /** Every team the driver raced for this season, most recent last. */
  Constructors: JolpicaConstructor[];
}

/** The MRData body of a Jolpica response, limited to the tables we read. */
export interface JolpicaData {
  RaceTable?: {
    Races: (JolpicaRace & {
      Results?: JolpicaResult[];
      QualifyingResults?: JolpicaQualifyingResult[];
    })[];
  };
  StandingsTable?: {
    StandingsLists: { DriverStandings: JolpicaDriverStanding[] }[];
  };
  DriverTable?: { Drivers: JolpicaDriver[] };
}

/**
 * The id we store in `races.apiRaceId`, e.g. "interlagos_2026". Jolpica has
 * no race id, and its round numbers shift when the calendar changes, so the
 * circuit is the race's identity within a season.
 */
export function jolpicaRaceId(race: JolpicaRace): string {
  return `${race.Circuit.circuitId}_${race.season}`;
}

/** Convert a Jolpica calendar entry to the shape lib/scheduleSync works on. */
export function toRaceData(race: JolpicaRace): RaceData {
  return {
    raceId: jolpicaRaceId(race),
    raceName: race.raceName,
    round: Number(race.round) || undefined,
    schedule: {
      fp1: race.FirstPractice,
      fp2: race.SecondPractice,
      fp3: race.ThirdPractice,
      qualy: race.Qualifying,
      race: { date: race.date, time: race.time },
    },
    circuit: {
      circuitName: race.Circuit.circuitName,
      city: race.Circuit.Location?.locality,
      country: race.Circuit.Location?.country,
    },
  };
}

/** Classified finishers have a numeric positionText. */
function isClassified(result: JolpicaResult): boolean {
  return /^\d+$/.test(result.positionText);
}

/**
 * Statuses that mean the car took the flag. Jolpica reports "Finished" or
 * "Lapped" from 2024 on; older seasons use "+1 Lap", "+2 Laps" and so on.
 */
function tookTheFlag(status: string): boolean {
  return /^(finished|lapped|\+\d+ laps?)$/i.test(status.trim());
}

/**
 * Did not finish, for DNF predictions: retired, not classified, withdrew or
 * failed to qualify, plus drivers who were classified on distance but stopped
 * before the flag (Albon, Singapore 2026). Disqualified (D) and excluded (E)
 * drivers took the flag, so they are not DNFs.
 */
function isDnf(result: JolpicaResult): boolean {
  if (!isClassified(result)) {
    return result.positionText !== "D" && result.positionText !== "E";
  }
  return !tookTheFlag(result.status);
}

export interface OfficialResults {
  positions: { position: number; driverNumber: number; points: number }[];
  fastestLapDriverId?: number;
  polePositionDriverId?: number;
  dnfDriverIds: number[];
}

/**
 * Turn Jolpica race (and, if available, qualifying) results into what we
 * store on a race. Pole is the fastest qualifier, the official definition;
 * grid slot 1 is only a fallback because grid penalties can move it.
 */
export function parseOfficialResults(
  results: JolpicaResult[],
  qualifying?: JolpicaQualifyingResult[]
): OfficialResults {
  const positions = results
    .filter(isClassified)
    .map((r) => ({
      position: Number(r.positionText),
      driverNumber: Number(r.number),
      points: Number(r.points) || 0,
    }))
    .sort((a, b) => a.position - b.position);

  const fastestLap = results.find((r) => r.FastestLap?.rank === "1");
  const pole =
    qualifying?.find((q) => q.position === "1") ??
    results.find((r) => r.grid === "1");

  return {
    positions,
    fastestLapDriverId: fastestLap ? Number(fastestLap.number) : undefined,
    polePositionDriverId: pole ? Number(pole.number) : undefined,
    dnfDriverIds: results.filter(isDnf).map((r) => Number(r.number)),
  };
}

export interface SeasonDriverRow {
  driverNumber: number;
  name: string;
  teamName: string;
  teamLogo?: string;
  countryCode: string;
}

function driverRow(
  driver: JolpicaDriver,
  team: string | undefined
): SeasonDriverRow | null {
  const driverNumber = Number(driver.permanentNumber);
  if (!Number.isInteger(driverNumber) || driverNumber <= 0) return null;
  return {
    driverNumber,
    name: `${driver.givenName} ${driver.familyName}`.trim(),
    teamName: team || "Unknown Team",
    countryCode: driver.nationality || "",
  };
}

/**
 * Season driver list from the driver standings: everyone who has raced this
 * season, with their current team (the last one listed). Drivers without a
 * permanent number (Friday practice rookies) are left out.
 */
export function driversFromStandings(
  standings: JolpicaDriverStanding[]
): SeasonDriverRow[] {
  return standings
    .map((s) =>
      driverRow(s.Driver, s.Constructors[s.Constructors.length - 1]?.name)
    )
    .filter((row): row is SeasonDriverRow => row !== null);
}

/** Before the first race there are no standings: drivers without teams. */
export function driversFromDriverList(
  drivers: JolpicaDriver[]
): SeasonDriverRow[] {
  return drivers
    .map((d) => driverRow(d, undefined))
    .filter((row): row is SeasonDriverRow => row !== null);
}
