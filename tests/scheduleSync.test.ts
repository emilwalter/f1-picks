import { describe, expect, it } from "vitest";
import {
  MISSING_RACE_GRACE_MS,
  planScheduleSync,
  scheduleSessionTimes,
  type RaceData,
  type StoredRace,
} from "../convex/lib/scheduleSync";

const NOW = Date.parse("2026-10-03T06:00:00Z");
const HOUR = 60 * 60 * 1000;

function entry(
  raceId: string,
  circuitName: string,
  date: string,
  time: string | null = "13:00:00Z",
  round = 1
): RaceData {
  return {
    raceId,
    raceName: `${raceId} Grand Prix`,
    round,
    schedule: { race: { date, time } },
    circuit: { circuitName, city: "City", country: "Country" },
  };
}

function stored(
  id: string,
  from: RaceData,
  overrides: Partial<StoredRace> = {}
): StoredRace {
  const date = Date.parse(
    `${from.schedule!.race!.date}T${from.schedule!.race!.time ?? "12:00:00Z"}`
  );
  return {
    _id: id,
    round: from.round ?? 1,
    apiRaceId: from.raceId,
    name: from.raceName!,
    date,
    circuit: from.circuit!.circuitName!,
    location: "City",
    country: "Country",
    // What an earlier sync of this entry would have stored.
    sessionTimes: scheduleSessionTimes(from),
    hasResults: false,
    ...overrides,
  };
}

const spain = entry(
  "spanish_2026",
  "Circuito de Madring",
  "2026-09-13",
  "13:00:00Z",
  16
);
const singapore = entry(
  "singapore_2026",
  "Marina Bay Street Circuit",
  "2026-10-11",
  "12:00:00Z",
  18
);

describe("planScheduleSync", () => {
  it("leaves races that match upstream alone", () => {
    const plan = planScheduleSync(
      [stored("spain", spain), stored("sg", singapore)],
      [spain, singapore],
      NOW
    );
    expect(plan.creates).toEqual([]);
    expect(plan.updates).toEqual([]);
    expect(plan.markMissing).toEqual([]);
    expect(plan.cancels).toEqual([]);
  });

  it("adds a new upstream race after the last round when its round is taken", () => {
    // f1api.dev listed the relocated Bahrain GP as round 16, which we use for Spain.
    const sepang = entry(
      "bahrain_2026",
      "Sepang International Circuit",
      "2026-10-04",
      null,
      16
    );
    const plan = planScheduleSync(
      [stored("spain", spain), stored("sg", singapore)],
      [spain, sepang, singapore],
      NOW
    );
    expect(plan.creates).toHaveLength(1);
    expect(plan.creates[0]).toMatchObject({
      apiRaceId: "bahrain_2026",
      circuit: "Sepang International Circuit",
      round: 19,
    });
  });

  it("treats a relocated race as new instead of reviving the cancelled one", () => {
    const sakhir = entry(
      "bahrain_2026",
      "Bahrain International Circuit",
      "2026-04-12",
      "15:00:00Z",
      4
    );
    const sepang = entry(
      "bahrain_2026",
      "Sepang International Circuit",
      "2026-10-04",
      null,
      16
    );
    const cancelledSakhir = stored("sakhir", sakhir, {
      status: "cancelled",
      statusSource: "host",
    });

    const plan = planScheduleSync(
      [cancelledSakhir, stored("spain", spain)],
      [spain, sepang],
      NOW
    );

    expect(plan.creates.map((r) => r.circuit)).toEqual([
      "Sepang International Circuit",
    ]);
    expect(plan.updates.map((u) => u.raceId)).not.toContain("sakhir");
    expect(plan.reinstates).toEqual([]);
  });

  it("marks a race missing the first time upstream drops it", () => {
    const plan = planScheduleSync(
      [stored("spain", spain), stored("sg", singapore)],
      [spain],
      NOW
    );
    expect(plan.markMissing).toEqual(["sg"]);
    expect(plan.stillMissing).toEqual(["sg"]);
    expect(plan.cancels).toEqual([]);
  });

  it("waits out the grace period before cancelling", () => {
    const race = stored("sg", singapore, {
      missingFromScheduleSince: NOW - MISSING_RACE_GRACE_MS + HOUR,
    });
    const plan = planScheduleSync([stored("spain", spain), race], [spain], NOW);
    expect(plan.cancels).toEqual([]);
    expect(plan.stillMissing).toEqual(["sg"]);
  });

  it("cancels a race missing for longer than the grace period", () => {
    const race = stored("sg", singapore, {
      missingFromScheduleSince: NOW - MISSING_RACE_GRACE_MS - HOUR,
    });
    const plan = planScheduleSync([stored("spain", spain), race], [spain], NOW);
    expect(plan.cancels).toEqual(["sg"]);
  });

  it("does not cancel anything when the upstream response looks truncated", () => {
    const missingSince = NOW - MISSING_RACE_GRACE_MS - HOUR;
    const others = Array.from({ length: 5 }, (_, i) =>
      stored(`r${i}`, entry(`r${i}`, `Circuit ${i}`, `2026-11-0${i + 1}`), {
        missingFromScheduleSince: missingSince,
      })
    );
    const plan = planScheduleSync(
      [stored("spain", spain), ...others],
      [spain],
      NOW
    );
    expect(plan.scheduleLooksComplete).toBe(false);
    expect(plan.cancels).toEqual([]);
  });

  it("reinstates a race the sync cancelled once it is back on the same day", () => {
    const race = stored("sg", singapore, {
      status: "cancelled",
      statusSource: "schedule",
      missingFromScheduleSince: NOW - 3 * MISSING_RACE_GRACE_MS,
    });
    const plan = planScheduleSync([race], [singapore], NOW);
    expect(plan.reinstates).toEqual(["sg"]);
    expect(plan.clearMissing).toEqual(["sg"]);
    expect(plan.creates).toEqual([]);
  });

  it("keeps a host cancellation even when upstream still lists the race", () => {
    const race = stored("sg", singapore, {
      status: "cancelled",
      statusSource: "host",
    });
    const plan = planScheduleSync([race], [singapore], NOW);
    expect(plan.reinstates).toEqual([]);
    expect(plan.creates).toEqual([]);
  });

  it("never cancels a race a host reinstated", () => {
    const race = stored("sg", singapore, {
      status: "scheduled",
      statusSource: "host",
      missingFromScheduleSince: NOW - 3 * MISSING_RACE_GRACE_MS,
    });
    const plan = planScheduleSync([stored("spain", spain), race], [spain], NOW);
    expect(plan.cancels).toEqual([]);
    expect(plan.markMissing).toEqual([]);
  });

  it("ignores races that already have results", () => {
    const race = stored("sg", singapore, { hasResults: true });
    const plan = planScheduleSync([stored("spain", spain), race], [spain], NOW);
    expect(plan.markMissing).toEqual([]);
    expect(plan.cancels).toEqual([]);
  });

  it("keeps a real start time when upstream only has the date", () => {
    const realStart = Date.parse("2026-10-04T07:00:00Z");
    const sepang = entry(
      "bahrain_2026",
      "Sepang International Circuit",
      "2026-10-04",
      null
    );
    const race = stored("sepang", sepang, {
      date: realStart,
      sessionTimes: { race: { start: realStart, end: realStart + 2 * HOUR } },
    });
    const plan = planScheduleSync([race], [sepang], NOW);
    expect(plan.updates).toEqual([]);
  });

  it("picks up a start time once upstream publishes it", () => {
    const placeholder = entry(
      "bahrain_2026",
      "Sepang International Circuit",
      "2026-10-04",
      null
    );
    const published = entry(
      "bahrain_2026",
      "Sepang International Circuit",
      "2026-10-04",
      "07:00:00Z"
    );
    const plan = planScheduleSync(
      [stored("sepang", placeholder)],
      [published],
      NOW
    );
    expect(plan.updates).toHaveLength(1);
    expect(plan.updates[0].date).toBe(Date.parse("2026-10-04T07:00:00Z"));
    expect(plan.updates[0].sessionTimes?.race?.start).toBe(
      Date.parse("2026-10-04T07:00:00Z")
    );
  });

  it("follows a scheduled race that upstream moves to another date", () => {
    const moved = entry(
      "singapore_2026",
      "Marina Bay Street Circuit",
      "2026-10-18",
      "12:00:00Z",
      18
    );
    const plan = planScheduleSync([stored("sg", singapore)], [moved], NOW);
    expect(plan.creates).toEqual([]);
    expect(plan.updates).toHaveLength(1);
    expect(plan.updates[0]).toMatchObject({
      raceId: "sg",
      date: Date.parse("2026-10-18T12:00:00Z"),
    });
  });
});
