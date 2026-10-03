/**
 * Reconcile the races we store against f1api.dev's season calendar.
 *
 * Pure functions only (no database, no network), so the rules for added,
 * moved and dropped races can be unit tested. actions/f1Connect fetches the
 * calendar and applies the plan this module returns.
 */

/** One race in f1api.dev's season calendar. Times are null until published. */
export interface RaceData {
  raceId?: string;
  raceName?: string;
  round?: number;
  schedule?: {
    fp1?: ScheduleSession;
    fp2?: ScheduleSession;
    fp3?: ScheduleSession;
    qualy?: ScheduleSession;
    race?: ScheduleSession;
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

type ScheduleSession = { date?: string | null; time?: string | null };

/** Normalized session block we persist for lockout calculations. */
export type SessionTimes = {
  fp1?: { start: number; end: number };
  fp2?: { start: number; end: number };
  fp3?: { start: number; end: number };
  qualifying?: { start: number; end: number };
  race?: { start: number; end: number };
};

/**
 * A race that is in our database but missing from upstream is only cancelled
 * once it has been missing this long, so a single bad API response can't
 * cancel a race people have predicted on.
 */
export const MISSING_RACE_GRACE_MS = 24 * 60 * 60 * 1000;

/**
 * If upstream returns fewer than this share of the season's active races, the
 * response is treated as truncated and nothing is cancelled.
 */
export const MIN_SCHEDULE_COVERAGE = 0.5;

/** Race start timestamp for a schedule entry, or null when the API omits the date. */
export function scheduleRaceStart(entry: RaceData): number | null {
  const date = entry.schedule?.race?.date;
  if (!date) return null;
  const time = entry.schedule?.race?.time || "12:00:00Z";
  const ts = new Date(`${date}T${time}`).getTime();
  return Number.isNaN(ts) ? null : ts;
}

export function scheduleCircuit(entry: RaceData): string {
  return entry.circuit?.circuitName || entry.circuitName || "Unknown";
}

export function scheduleRound(entry: RaceData): number {
  return Number(entry.round) || 0;
}

/**
 * Case/diacritic/punctuation-insensitive circuit key.
 * Circuit names are unique within a season and stable across API calendar
 * changes, which makes them a reliable identity for matching stored races.
 */
function circuitKey(circuit: string): string {
  // NFD splits accented letters into base + combining mark, and the
  // [^a-z0-9] filter then drops the mark: "Autódromo" and "Autodromo"
  // both collapse to "autodromo".
  return circuit
    .normalize("NFD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function utcDay(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

export function scheduleSessionTimes(
  entry: RaceData
): SessionTimes | undefined {
  const schedule = entry.schedule;
  if (!schedule) return undefined;

  const parseSessionTime = (session?: ScheduleSession) => {
    if (!session || !session.date || !session.time) return undefined;
    const start = new Date(`${session.date}T${session.time}`).getTime();
    if (Number.isNaN(start)) return undefined;
    // Estimate end time as 2 hours after start (adjust as needed)
    return { start, end: start + 2 * 60 * 60 * 1000 };
  };

  const sessionTimes: SessionTimes = {
    fp1: parseSessionTime(schedule.fp1),
    fp2: parseSessionTime(schedule.fp2),
    fp3: parseSessionTime(schedule.fp3),
    qualifying: parseSessionTime(schedule.qualy),
    race: parseSessionTime(schedule.race),
  };

  // f1api.dev lists late additions (the 2026 Bahrain GP in Malaysia) with
  // dates but null times. No parsed sessions means "unknown", not "none", so
  // return undefined and leave any session times we already store alone.
  return Object.values(sessionTimes).some(Boolean) ? sessionTimes : undefined;
}

/**
 * True when upstream gives a race date without a start time and the stored
 * race is on the same UTC day. {@link scheduleRaceStart} then falls back to a
 * 12:00Z placeholder, which must not overwrite a real start time.
 */
function isPlaceholderForSameDay(entry: RaceData, storedDate: number): boolean {
  if (entry.schedule?.race?.time) return false;
  return entry.schedule?.race?.date === utcDay(storedDate);
}

function sessionTimesEqual(a?: SessionTimes, b?: SessionTimes): boolean {
  const keys = ["fp1", "fp2", "fp3", "qualifying", "race"] as const;
  return keys.every(
    (key) =>
      (a?.[key]?.start ?? null) === (b?.[key]?.start ?? null) &&
      (a?.[key]?.end ?? null) === (b?.[key]?.end ?? null)
  );
}

/**
 * Identity of a stored race, as far as the upstream API is concerned.
 *
 * Neither matcher below falls back to `round`. f1api.dev renumbers rounds when
 * its calendar changes (in 2026 it dropped Bahrain + Saudi Arabia, shifting
 * every later round down by 2), so a round-based match happily pairs a stored
 * race with a completely different grand prix.
 */
type RaceIdentity = {
  apiRaceId?: string;
  circuit: string;
  date: number;
};

/** Find the schedule entry that a stored race refers to. */
export function matchScheduleEntry(
  race: RaceIdentity,
  schedule: RaceData[]
): RaceData | null {
  if (race.apiRaceId) {
    const byId = schedule.find((entry) => entry.raceId === race.apiRaceId);
    if (byId) return byId;
  }

  const key = circuitKey(race.circuit);
  const byCircuit = schedule.find(
    (entry) => circuitKey(scheduleCircuit(entry)) === key
  );
  if (byCircuit) return byCircuit;

  return (
    schedule.find((entry) => scheduleRaceStart(entry) === race.date) ?? null
  );
}

/** Inverse of {@link matchScheduleEntry}: find the stored race for a schedule entry. */
function matchStoredRace<T extends RaceIdentity>(
  entry: RaceData,
  raceStart: number,
  races: T[]
): T | null {
  if (entry.raceId) {
    const byId = races.find((race) => race.apiRaceId === entry.raceId);
    if (byId) return byId;
  }

  const key = circuitKey(scheduleCircuit(entry));
  const byCircuit = races.find((race) => circuitKey(race.circuit) === key);
  if (byCircuit) return byCircuit;

  return races.find((race) => race.date === raceStart) ?? null;
}

/** The fields of a stored race that schedule reconciliation reads. */
export type StoredRace<TId extends string = string> = RaceIdentity & {
  _id: TId;
  round: number;
  name: string;
  location: string;
  country: string;
  sessionTimes?: SessionTimes;
  status?: "scheduled" | "cancelled";
  /** Who last set `status`: a room host, or this reconciliation. */
  statusSource?: "host" | "schedule";
  /** When the sync first noticed the race missing upstream. */
  missingFromScheduleSince?: number;
  hasResults: boolean;
};

export type NewRace = {
  round: number;
  apiRaceId?: string;
  name: string;
  date: number;
  circuit: string;
  location: string;
  country: string;
  sessionTimes?: SessionTimes;
};

export type RaceSchedulePatch<TId extends string = string> = {
  raceId: TId;
  apiRaceId?: string;
  name?: string;
  date?: number;
  circuit?: string;
  location?: string;
  country?: string;
  sessionTimes?: SessionTimes;
};

export type ScheduleSyncPlan<TId extends string = string> = {
  creates: NewRace[];
  /** Schedule fields that drifted from upstream, per race. */
  updates: RaceSchedulePatch<TId>[];
  /** Missing upstream for longer than the grace period. */
  cancels: TId[];
  /** Cancelled by an earlier sync and back on the calendar. */
  reinstates: TId[];
  /** Missing upstream for the first time; starts the grace period. */
  markMissing: TId[];
  /** Back on the calendar after being marked missing. */
  clearMissing: TId[];
  /** Missing upstream but not cancelled yet (grace period, truncated response). */
  stillMissing: TId[];
  /** Upstream entries without a race date. */
  skipped: string[];
  /** False when the response looked truncated, so cancellation was skipped. */
  scheduleLooksComplete: boolean;
};

/**
 * Whether a stored race may be paired with this schedule entry.
 *
 * A cancelled race only matches an entry on the same day. f1api.dev reuses
 * the race ID when it relocates an event (bahrain_2026 went from Sakhir in
 * April to Sepang in October), and matching that to the cancelled April race
 * would either hide the new event or revive the old one with predictions
 * made for a different weekend. A different day means a new race.
 */
function canMatch(race: StoredRace, raceStart: number): boolean {
  return race.status !== "cancelled" || utcDay(race.date) === utcDay(raceStart);
}

export function planScheduleSync<TId extends string>(
  existing: StoredRace<TId>[],
  schedule: RaceData[],
  now: number
): ScheduleSyncPlan<TId> {
  const plan: ScheduleSyncPlan<TId> = {
    creates: [],
    updates: [],
    cancels: [],
    reinstates: [],
    markMissing: [],
    clearMissing: [],
    stillMissing: [],
    skipped: [],
    scheduleLooksComplete: true,
  };

  const claimed = new Set<TId>();
  // Stored rounds keep the numbering users already see. A race upstream adds
  // mid-season (Bahrain moved to Sepang in 2026 came back as upstream round
  // 16, which we already use for the Spanish GP) goes after the last round
  // instead of sharing a number, since `round` picks the race's images and
  // getRaceBySeasonRound expects it to be unique.
  const usedRounds = new Set(existing.map((race) => race.round));

  for (const entry of schedule) {
    const raceDate = scheduleRaceStart(entry);
    if (raceDate === null) {
      plan.skipped.push(entry.raceName || entry.raceId || "unknown race");
      continue;
    }

    const round = scheduleRound(entry) || 1;
    const name = entry.raceName || `Race ${round}`;
    const circuit = scheduleCircuit(entry);
    const location = entry.circuit?.city || entry.location || "Unknown";
    const country = entry.circuit?.country || entry.country || "Unknown";
    const sessionTimes = scheduleSessionTimes(entry);

    const stored = matchStoredRace(
      entry,
      raceDate,
      existing.filter(
        (race) => !claimed.has(race._id) && canMatch(race, raceDate)
      )
    );

    if (!stored) {
      const newRound = usedRounds.has(round)
        ? Math.max(...usedRounds) + 1
        : round;
      usedRounds.add(newRound);
      plan.creates.push({
        round: newRound,
        apiRaceId: entry.raceId,
        name,
        date: raceDate,
        circuit,
        location,
        country,
        sessionTimes,
      });
      continue;
    }

    claimed.add(stored._id);

    if (stored.missingFromScheduleSince !== undefined) {
      plan.clearMissing.push(stored._id);
    }
    if (stored.status === "cancelled" && stored.statusSource === "schedule") {
      plan.reinstates.push(stored._id);
    }

    // Bring the stored row back in step with upstream. `round` is deliberately
    // left alone: upstream renumbering shouldn't reshuffle the rounds users
    // already see, and nothing addresses the API by our stored round any more.
    const patch: RaceSchedulePatch<TId> = {
      raceId: stored._id,
      apiRaceId:
        entry.raceId && stored.apiRaceId !== entry.raceId
          ? entry.raceId
          : undefined,
      name: stored.name !== name ? name : undefined,
      date:
        stored.date !== raceDate && !isPlaceholderForSameDay(entry, stored.date)
          ? raceDate
          : undefined,
      circuit: stored.circuit !== circuit ? circuit : undefined,
      location: stored.location !== location ? location : undefined,
      country: stored.country !== country ? country : undefined,
      sessionTimes:
        sessionTimes && !sessionTimesEqual(stored.sessionTimes, sessionTimes)
          ? sessionTimes
          : undefined,
    };

    const hasDrift = Object.entries(patch).some(
      ([key, value]) => key !== "raceId" && value !== undefined
    );
    if (hasDrift) {
      plan.updates.push(patch);
    }
  }

  const activeRaces = existing.filter((race) => race.status !== "cancelled");
  plan.scheduleLooksComplete =
    schedule.length >= activeRaces.length * MIN_SCHEDULE_COVERAGE;

  for (const race of existing) {
    if (claimed.has(race._id)) continue;
    // Nothing to decide for races that are already cancelled or already ran.
    if (race.status === "cancelled" || race.hasResults) continue;
    // A host put this race back after a cancellation; don't overrule them.
    if (race.statusSource === "host") continue;

    if (race.missingFromScheduleSince === undefined) {
      plan.markMissing.push(race._id);
      plan.stillMissing.push(race._id);
    } else if (
      plan.scheduleLooksComplete &&
      now - race.missingFromScheduleSince >= MISSING_RACE_GRACE_MS
    ) {
      plan.cancels.push(race._id);
    } else {
      plan.stillMissing.push(race._id);
    }
  }

  return plan;
}
