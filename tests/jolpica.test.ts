import { describe, expect, it } from "vitest";
import {
  driversFromDriverList,
  driversFromStandings,
  jolpicaRaceId,
  parseOfficialResults,
  toRaceData,
  type JolpicaDriverStanding,
  type JolpicaQualifyingResult,
  type JolpicaRace,
  type JolpicaResult,
} from "../convex/lib/jolpica";
import {
  planScheduleSync,
  scheduleSessionTimes,
  type StoredRace,
} from "../convex/lib/scheduleSync";
import fixture from "./fixtures/jolpica-2026.json";

const calendar = fixture.calendar2026 as JolpicaRace[];
const storedRaces = fixture.storedRaces2026 as StoredRace[];
const NOW = Date.parse("2026-11-06T08:00:00Z");

function result(overrides: Partial<JolpicaResult>): JolpicaResult {
  return {
    number: "99",
    positionText: "1",
    points: "0",
    grid: "5",
    status: "Finished",
    Driver: {
      driverId: "someone",
      permanentNumber: "99",
      givenName: "Some",
      familyName: "One",
    },
    Constructor: { constructorId: "team", name: "Team" },
    ...overrides,
  };
}

describe("toRaceData", () => {
  const brazil = calendar.find((r) => r.Circuit.circuitId === "interlagos")!;

  it("keys a race by circuit and season", () => {
    expect(jolpicaRaceId(brazil)).toBe("interlagos_2026");
    expect(toRaceData(brazil).raceId).toBe("interlagos_2026");
  });

  it("maps Jolpica sessions onto the times we lock predictions on", () => {
    const times = scheduleSessionTimes(toRaceData(brazil))!;
    expect(new Date(times.qualifying!.start).toISOString()).toBe(
      "2026-11-07T18:00:00.000Z"
    );
    expect(new Date(times.race!.start).toISOString()).toBe(
      "2026-11-08T17:00:00.000Z"
    );
    expect(new Date(times.fp1!.start).toISOString()).toBe(
      "2026-11-06T15:30:00.000Z"
    );
  });
});

describe("switching the stored 2026 season to Jolpica", () => {
  const plan = planScheduleSync(storedRaces, calendar.map(toRaceData), NOW, {
    syncDisplayFields: false,
  });

  it("pairs every Jolpica race with a race we already store", () => {
    expect(plan.creates).toEqual([]);
  });

  it("finds every active race upstream, so nothing is headed for cancellation", () => {
    expect(plan.markMissing).toEqual([]);
    expect(plan.cancels).toEqual([]);
    expect(plan.stillMissing).toEqual([]);
  });

  it("does not bring back the races cancelled in April", () => {
    expect(plan.reinstates).toEqual([]);
  });

  it("moves every active race onto Jolpica ids", () => {
    const active = storedRaces.filter((r) => r.status !== "cancelled");
    const newIds = new Map(
      plan.updates
        .filter((p) => p.apiRaceId)
        .map((p) => [p.raceId, p.apiRaceId])
    );
    for (const race of active) {
      const id = newIds.get(race._id) ?? race.apiRaceId;
      expect(id, race.name).toMatch(/^[a-z_]+_2026$/);
      expect(calendar.map(jolpicaRaceId)).toContain(id);
    }
    expect(newIds.get(storedRaces.find((r) => r.round === 21)!._id)).toBe(
      "interlagos_2026"
    );
    expect(newIds.get(storedRaces.find((r) => r.round === 25)!._id)).toBe(
      "sepang_2026"
    );
  });

  it("keeps the race names users already see", () => {
    for (const patch of plan.updates) {
      expect(patch.name).toBeUndefined();
      expect(patch.circuit).toBeUndefined();
      expect(patch.location).toBeUndefined();
      expect(patch.country).toBeUndefined();
    }
  });

  it("leaves the Sao Paulo prediction lockout where it was", () => {
    const brazil = storedRaces.find((r) => r.round === 21)!;
    const patch = plan.updates.find((p) => p.raceId === brazil._id);
    expect(patch?.date).toBeUndefined();
    const qualifying =
      patch?.sessionTimes?.qualifying ?? brazil.sessionTimes?.qualifying;
    expect(qualifying?.start).toBe(brazil.sessionTimes?.qualifying?.start);
  });
});

describe("parseOfficialResults", () => {
  it("reads Mexico 2026", () => {
    const parsed = parseOfficialResults(
      fixture.mexicoResults as JolpicaResult[],
      fixture.mexicoQualifying as JolpicaQualifyingResult[]
    );

    expect(parsed.positions.slice(0, 3)).toEqual([
      { position: 1, driverNumber: 3, points: 25 },
      { position: 2, driverNumber: 44, points: 18 },
      { position: 3, driverNumber: 12, points: 15 },
    ]);
    // Only classified finishers get a position.
    expect(parsed.positions).toHaveLength(17);
    expect(parsed.fastestLapDriverId).toBe(44);
    expect(parsed.polePositionDriverId).toBe(44);
    // Lindblad, Bearman, Bottas, Stroll, Alonso.
    expect(parsed.dnfDriverIds.sort((a, b) => a - b)).toEqual([
      14, 18, 41, 77, 87,
    ]);
  });

  it("counts a driver classified on distance who stopped before the flag as a DNF", () => {
    // Albon was classified 18th in Singapore 2026 but retired on lap 59 of 62.
    const parsed = parseOfficialResults(
      fixture.singaporeResults as JolpicaResult[]
    );
    expect(parsed.positions.find((p) => p.driverNumber === 23)?.position).toBe(
      18
    );
    expect(parsed.dnfDriverIds).toContain(23);
    // Lapped cars took the flag.
    expect(parsed.dnfDriverIds).not.toContain(77);
  });

  it("does not count disqualified or excluded drivers as DNFs", () => {
    const parsed = parseOfficialResults([
      result({ number: "1", positionText: "1" }),
      result({ number: "2", positionText: "D", status: "Disqualified" }),
      result({ number: "3", positionText: "E", status: "Excluded" }),
      result({ number: "4", positionText: "W", status: "Withdrew" }),
      result({ number: "5", positionText: "R", status: "Retired" }),
    ]);
    expect(parsed.positions.map((p) => p.driverNumber)).toEqual([1]);
    expect(parsed.dnfDriverIds).toEqual([4, 5]);
  });

  it("gives pole to the fastest qualifier, not whoever starts first", () => {
    const parsed = parseOfficialResults(
      [
        result({ number: "1", positionText: "1", grid: "1" }),
        result({ number: "2", positionText: "2", grid: "11" }),
      ],
      [{ number: "2", position: "1", Driver: result({}).Driver }]
    );
    expect(parsed.polePositionDriverId).toBe(2);
  });

  it("falls back to grid slot 1 without qualifying results", () => {
    const parsed = parseOfficialResults([
      result({ number: "1", positionText: "1", grid: "3" }),
      result({ number: "2", positionText: "2", grid: "1" }),
    ]);
    expect(parsed.polePositionDriverId).toBe(2);
  });

  it("accepts older Ergast lap statuses as finishes", () => {
    const parsed = parseOfficialResults([
      result({ number: "1", positionText: "1" }),
      result({ number: "2", positionText: "2", status: "+1 Lap" }),
      result({ number: "3", positionText: "3", status: "+2 Laps" }),
      result({ number: "4", positionText: "4", status: "Engine" }),
    ]);
    expect(parsed.dnfDriverIds).toEqual([4]);
  });
});

describe("season drivers", () => {
  const drivers = driversFromStandings(
    fixture.standings2026 as JolpicaDriverStanding[]
  );

  it("uses the numbers results are scored with", () => {
    const number = (name: string) =>
      drivers.find((d) => d.name.endsWith(name))?.driverNumber;
    expect(number("Verstappen")).toBe(3);
    expect(number("Norris")).toBe(1);
    expect(number("Lindblad")).toBe(41);
  });

  it("uses each driver's most recent team", () => {
    const lawson = drivers.find((d) => d.name === "Liam Lawson")!;
    expect(lawson.teamName).toBe("Red Bull");
  });

  it("has no duplicate numbers", () => {
    const numbers = drivers.map((d) => d.driverNumber);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it("skips drivers without a permanent number", () => {
    expect(
      driversFromDriverList([
        { driverId: "rookie", givenName: "Friday", familyName: "Rookie" },
        {
          driverId: "max_verstappen",
          permanentNumber: "3",
          givenName: "Max",
          familyName: "Verstappen",
          nationality: "Dutch",
        },
      ])
    ).toEqual([
      {
        driverNumber: 3,
        name: "Max Verstappen",
        teamName: "Unknown Team",
        countryCode: "Dutch",
      },
    ]);
  });
});
