/**
 * Scoring logic for F1 predictions.
 * Used by applyScoringForRoomRace, which scores every prediction in a room for one race.
 */
import {
  BLACKJACK_EXACT_POINTS,
  BLACKJACK_TARGET,
  BLACKJACK_WIN_POINTS,
  DOUBLE_DOWN_FACTOR,
  blackjackHand,
  isRuleActive,
  setMultiplierFor,
  type PredictionExtras,
  type RaceRule,
  type RuleLine,
} from "./raceRules";

export interface Prediction {
  predictedPositions: Array<{ position: number; driverNumber: number }>;
  fastestLapDriverId?: number;
  polePositionDriverId?: number;
  dnfDriverIds: number[];
  extras?: PredictionExtras;
}

export interface OfficialResults {
  positions: Array<{ position: number; driverNumber: number }>;
  fastestLapDriverId?: number;
  polePositionDriverId?: number;
  dnfDriverIds: number[];
}

export interface ScoringConfig {
  positionPoints: number[];
  fastestLapPoints: number;
  polePositionPoints: number;
  /**
   * Added to the multiplier per correct DNF: finalMultiplier = 1 + rate × correctDnfCount.
   * Example: 0.1 and 7 correct DNFs → ×1.7 on (positions + FL + pole) for that race.
   */
  dnfCorrectMultiplier?: number;
  dnfPenalty: number;
}

export interface ScoreBreakdown {
  positionPoints: number;
  fastestLapPoints: number;
  polePositionPoints: number;
  /** Applied to (position + FL + pole), e.g. 1.7 */
  dnfMultiplierApplied: number;
  /** Extra points from multiplier: base × (multiplier − 1) */
  dnfMultiplierBonus: number;
  dnfPenalty: number;
  /** Lines added by per-race rules (Set Multiplier, Double Down, ...). */
  ruleLines?: RuleLine[];
  total: number;
}

/** Per-race inputs beyond the room's scoring config. */
export interface ScoringContext {
  rules?: RaceRule[];
  /** Winning Blackjack sum across the room for this race, see bestBlackjackSum. */
  blackjackBestSum?: number;
}

export interface ScoreResult {
  total: number;
  breakdown: ScoreBreakdown;
}

/**
 * Calculate score for a prediction based on official results.
 *
 * Order: (exact positions + Near-Miss + FL + pole) × DNF multiplier × Set
 * Multiplier, minus wrong-DNF penalties, plus flat Double Down and Blackjack points.
 */
export function calculateScore(
  prediction: Prediction,
  officialResults: OfficialResults,
  scoringConfig: ScoringConfig,
  context: ScoringContext = {}
): ScoreResult {
  let positionPoints = 0;
  let fastestLapPoints = 0;
  let polePositionPoints = 0;
  let dnfPenalty = 0;

  const rate = scoringConfig.dnfCorrectMultiplier ?? 0;
  const rules = context.rules ?? [];
  const ruleLines: RuleLine[] = [];

  const slotPoints = (position: number) =>
    scoringConfig.positionPoints[
      Math.min(position - 1, scoringConfig.positionPoints.length - 1)
    ] || 0;

  // Position points: exact slot only. Partial credit comes from the Near-Miss rule.
  const actualMap = new Map<number, number>();
  officialResults.positions.forEach((result) => {
    actualMap.set(result.driverNumber, result.position);
  });

  prediction.predictedPositions.forEach((pred) => {
    const actualPosition = actualMap.get(pred.driverNumber);
    if (actualPosition === undefined) return;
    if (pred.position !== actualPosition) return;
    positionPoints += slotPoints(pred.position);
  });

  // Near-Miss: one place off pays half the predicted slot. Multiplied like position points.
  let nearMissPoints = 0;
  if (isRuleActive(rules, "nearMiss")) {
    let nearMisses = 0;
    prediction.predictedPositions.forEach((pred) => {
      const actualPosition = actualMap.get(pred.driverNumber);
      if (actualPosition === undefined) return;
      if (Math.abs(actualPosition - pred.position) !== 1) return;
      nearMisses++;
      nearMissPoints += slotPoints(pred.position) / 2;
    });
    ruleLines.push({
      rule: "nearMiss",
      label:
        nearMisses === 0
          ? "Near-Miss: none one place off"
          : `Near-Miss: ${nearMisses} one place off`,
      points: round2(nearMissPoints),
    });
  }

  if (
    prediction.fastestLapDriverId !== undefined &&
    prediction.fastestLapDriverId === officialResults.fastestLapDriverId
  ) {
    fastestLapPoints = scoringConfig.fastestLapPoints;
  }

  if (
    prediction.polePositionDriverId !== undefined &&
    prediction.polePositionDriverId === officialResults.polePositionDriverId
  ) {
    polePositionPoints = scoringConfig.polePositionPoints;
  }

  const predictedDnfSet = new Set(prediction.dnfDriverIds);
  const actualDnfSet = new Set(officialResults.dnfDriverIds);

  let correctDnfCount = 0;
  predictedDnfSet.forEach((driverId) => {
    if (actualDnfSet.has(driverId)) {
      correctDnfCount++;
    }
  });

  let incorrectDnfCount = 0;
  predictedDnfSet.forEach((driverId) => {
    if (!actualDnfSet.has(driverId)) {
      incorrectDnfCount++;
    }
  });

  dnfPenalty = incorrectDnfCount * scoringConfig.dnfPenalty;

  const baseSubtotal =
    positionPoints + nearMissPoints + fastestLapPoints + polePositionPoints;
  const multiplier = 1 + rate * correctDnfCount;
  let scaledSubtotal = baseSubtotal * multiplier;
  const dnfMultiplierBonus = scaledSubtotal - baseSubtotal;

  // Set Multiplier: on top of the DNF multiplier, before penalties and flat points.
  if (isRuleActive(rules, "setMultiplier")) {
    const hits = new Set(
      prediction.predictedPositions
        .filter((pred) => {
          const actual = actualMap.get(pred.driverNumber);
          return actual !== undefined && actual <= 10;
        })
        .map((pred) => pred.driverNumber)
    ).size;
    const setMultiplier = setMultiplierFor(hits);
    const bonus = scaledSubtotal * (setMultiplier - 1);
    scaledSubtotal += bonus;
    ruleLines.push({
      rule: "setMultiplier",
      label:
        setMultiplier === 1
          ? `Set ${hits}/10: no multiplier`
          : `Set ${hits}/10: ×${setMultiplier}`,
      points: round2(bonus),
    });
  }

  // Flat rule points: not multiplied.
  let flatRulePoints = 0;

  const doubleDownPosition = prediction.extras?.doubleDownPosition;
  if (isRuleActive(rules, "doubleDown") && doubleDownPosition !== undefined) {
    const pick = prediction.predictedPositions.find(
      (p) => p.position === doubleDownPosition
    );
    if (pick && pick.driverNumber !== 0) {
      const slot = slotPoints(doubleDownPosition);
      const hit = actualMap.get(pick.driverNumber) === doubleDownPosition;
      const points = hit ? slot * (DOUBLE_DOWN_FACTOR - 1) : -slot;
      flatRulePoints += points;
      ruleLines.push({
        rule: "doubleDown",
        label: hit
          ? `Double Down P${doubleDownPosition}: hit, slot pays ${slot * DOUBLE_DOWN_FACTOR}`
          : `Double Down P${doubleDownPosition}: missed`,
        points,
      });
    }
  }

  if (isRuleActive(rules, "blackjack")) {
    const hand = blackjackHand(
      prediction.extras?.blackjackDriverIds,
      officialResults
    );
    if (hand.status !== "notPlayed") {
      let points = 0;
      let label: string;
      if (hand.status === "dnf") {
        label = "Blackjack: a pick did not finish";
      } else if (hand.status === "bust") {
        label = `Blackjack: ${hand.sum}, bust`;
      } else if (hand.sum === BLACKJACK_TARGET) {
        points = BLACKJACK_EXACT_POINTS;
        label = `Blackjack: exactly ${BLACKJACK_TARGET}`;
      } else if (hand.sum === context.blackjackBestSum) {
        points = BLACKJACK_WIN_POINTS;
        label = `Blackjack: ${hand.sum}, closest to ${BLACKJACK_TARGET}`;
      } else {
        label = `Blackjack: ${hand.sum}, beaten by ${context.blackjackBestSum}`;
      }
      flatRulePoints += points;
      ruleLines.push({ rule: "blackjack", label, points });
    }
  }

  // Net can be negative when wrong DNF picks or a lost Double Down exceed the rest.
  const total = round2(scaledSubtotal - Math.abs(dnfPenalty) + flatRulePoints);

  return {
    total,
    breakdown: {
      positionPoints,
      fastestLapPoints,
      polePositionPoints,
      dnfMultiplierApplied: multiplier,
      dnfMultiplierBonus,
      dnfPenalty: -Math.abs(dnfPenalty),
      ...(ruleLines.length > 0 ? { ruleLines } : {}),
      total,
    },
  };
}

/** Multipliers like ×1.2 leave float noise (64.80000000000001); keep scores at 2 decimals. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
