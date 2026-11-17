import { describe, expect, it } from "vitest";
import {
  bestBlackjackSum,
  blackjackHand,
  setMultiplierFor,
  type RaceRule,
} from "../convex/lib/raceRules";
import {
  calculateScore,
  type OfficialResults,
  type Prediction,
  type ScoringConfig,
} from "../convex/lib/scoring";

const config: ScoringConfig = {
  positionPoints: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
  fastestLapPoints: 0,
  polePositionPoints: 0,
  dnfPenalty: 0,
};

/** Drivers 1..20 finish in number order; 19 and 20 retire. */
const results: OfficialResults = {
  positions: Array.from({ length: 18 }, (_, i) => ({
    position: i + 1,
    driverNumber: i + 1,
  })),
  dnfDriverIds: [19, 20],
};

function predict(order: number[], extras?: Prediction["extras"]): Prediction {
  return {
    predictedPositions: order.map((driverNumber, i) => ({
      position: i + 1,
      driverNumber,
    })),
    dnfDriverIds: [],
    extras,
  };
}

const rules = (...kinds: RaceRule["kind"][]): RaceRule[] =>
  kinds.map((kind) => ({ kind }));

const line = (
  score: ReturnType<typeof calculateScore>,
  rule: RaceRule["kind"]
) => score.breakdown.ruleLines?.find((l) => l.rule === rule);

describe("no rules", () => {
  it("scores exactly as before and adds no rule lines", () => {
    const score = calculateScore(predict([1, 2, 4, 3]), results, config);
    expect(score.total).toBe(25 + 18);
    expect(score.breakdown.ruleLines).toBeUndefined();
  });
});

describe("Set Multiplier", () => {
  it.each([
    [5, 1],
    [6, 1.2],
    [7, 1.5],
    [8, 2],
    [9, 3],
    [10, 5],
  ])("%i hits → ×%f", (hits, multiplier) => {
    expect(setMultiplierFor(hits)).toBe(multiplier);
  });

  it("counts top 10 finishers in any order and multiplies the race score", () => {
    // P1 exact (25). Drivers 2..8 in the top 10 but out of order, 15 and 16 outside.
    const score = calculateScore(
      predict([1, 3, 2, 5, 4, 7, 6, 8, 15, 16]),
      results,
      config,
      { rules: rules("setMultiplier") }
    );
    expect(line(score, "setMultiplier")).toEqual({
      rule: "setMultiplier",
      label: "8/10, ×2",
      points: 25 + 4, // P1 exact 25, P8 exact 4
    });
    expect(score.total).toBe((25 + 4) * 2);
  });
});

describe("Near-Miss", () => {
  it("pays half the predicted slot for one place off", () => {
    // Predicted 2 in P1 (finished P2) and 1 in P2 (finished P1); 5 in P3 is two off.
    const score = calculateScore(predict([2, 1, 5]), results, config, {
      rules: rules("nearMiss"),
    });
    expect(line(score, "nearMiss")?.points).toBe(25 / 2 + 18 / 2);
    expect(score.total).toBe(21.5);
  });

  it("is multiplied by the Set Multiplier", () => {
    const order = [2, 1, 3, 4, 5, 6, 7, 8, 9, 10];
    const score = calculateScore(predict(order), results, config, {
      rules: rules("nearMiss", "setMultiplier"),
    });
    const exact = 15 + 12 + 10 + 8 + 6 + 4 + 2 + 1;
    expect(score.total).toBe((exact + 21.5) * 5);
  });
});

describe("Double Down", () => {
  it("an exact hit makes the slot pay 3×", () => {
    const score = calculateScore(
      predict([1, 2, 3, 4, 5, 6, 7], { doubleDownPosition: 7 }),
      results,
      config,
      { rules: rules("doubleDown") }
    );
    expect(line(score, "doubleDown")).toEqual({
      rule: "doubleDown",
      label: "P7 hit, slot pays 18",
      points: 12,
    });
    expect(score.total).toBe(25 + 18 + 15 + 12 + 10 + 8 + 6 + 12);
  });

  it("a miss loses the slot's points, and the loss is its own line", () => {
    const score = calculateScore(
      predict([1, 2, 3, 4, 5, 6, 8], { doubleDownPosition: 7 }),
      results,
      config,
      { rules: rules("doubleDown") }
    );
    expect(line(score, "doubleDown")?.points).toBe(-6);
    expect(score.total).toBe(25 + 18 + 15 + 12 + 10 + 8 - 6);
  });

  it("does nothing when the rule is off", () => {
    const score = calculateScore(
      predict([1, 2, 3, 4, 5, 6, 8], { doubleDownPosition: 7 }),
      results,
      config
    );
    expect(score.breakdown.ruleLines).toBeUndefined();
  });
});

describe("Blackjack", () => {
  it("sums finishing positions and voids a hand with a DNF", () => {
    expect(blackjackHand([2, 9, 10], results)).toEqual({
      status: "live",
      sum: 21,
    });
    expect(blackjackHand([5, 9, 10], results)).toEqual({
      status: "bust",
      sum: 24,
    });
    expect(blackjackHand([1, 2, 19], results)).toEqual({
      status: "dnf",
      driverNumbers: [19],
    });
    expect(blackjackHand([1, 2], results)).toEqual({ status: "notPlayed" });
  });

  it("closest live hand wins, bust hands never win", () => {
    const hands = [
      blackjackHand([1, 2, 3], results), // 6
      blackjackHand([4, 6, 8], results), // 18
      blackjackHand([5, 9, 10], results), // 24, bust
    ];
    expect(bestBlackjackSum(hands)).toBe(18);
  });

  it("pays 15 for closest, 30 for exactly 21, 0 otherwise", () => {
    const ctx = { rules: rules("blackjack"), blackjackBestSum: 18 };
    const score = (ids: number[]) =>
      calculateScore(
        predict([], { blackjackDriverIds: ids }),
        results,
        config,
        ctx
      );

    expect(score([4, 6, 8]).total).toBe(15);
    expect(line(score([4, 6, 8]), "blackjack")?.label).toBe(
      "18, closest to 21"
    );
    expect(score([1, 2, 3]).total).toBe(0);
    expect(line(score([1, 2, 3]), "blackjack")?.label).toBe("6, beaten by 18");
    expect(score([5, 9, 10]).total).toBe(0);
    expect(score([1, 2, 19]).total).toBe(0);
  });

  it("exactly 21 pays 30", () => {
    const score = calculateScore(
      predict([], { blackjackDriverIds: [2, 9, 10] }),
      results,
      config,
      { rules: rules("blackjack"), blackjackBestSum: 21 }
    );
    expect(score.total).toBe(30);
  });
});
