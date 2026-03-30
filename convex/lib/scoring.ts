/**
 * Scoring logic for F1 predictions
 * Isolated module used by applyRaceResults mutation
 */

export interface Prediction {
  predictedPositions: Array<{ position: number; driverNumber: number }>;
  fastestLapDriverId?: number;
  polePositionDriverId?: number;
  dnfDriverIds: number[];
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
  total: number;
}

export interface ScoreResult {
  total: number;
  breakdown: ScoreBreakdown;
}

/**
 * Calculate score for a prediction based on official results
 */
export function calculateScore(
  prediction: Prediction,
  officialResults: OfficialResults,
  scoringConfig: ScoringConfig
): ScoreResult {
  let positionPoints = 0;
  let fastestLapPoints = 0;
  let polePositionPoints = 0;
  let dnfPenalty = 0;

  const rate = scoringConfig.dnfCorrectMultiplier ?? 0;

  // Position points: exact slot only (no partial credit for one place off).
  const actualMap = new Map<number, number>();
  officialResults.positions.forEach((result) => {
    actualMap.set(result.driverNumber, result.position);
  });

  prediction.predictedPositions.forEach((pred) => {
    const actualPosition = actualMap.get(pred.driverNumber);
    if (actualPosition === undefined) return;
    if (pred.position !== actualPosition) return;
    const pointsIndex = Math.min(
      pred.position - 1,
      scoringConfig.positionPoints.length - 1
    );
    positionPoints += scoringConfig.positionPoints[pointsIndex] || 0;
  });

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

  const baseSubtotal = positionPoints + fastestLapPoints + polePositionPoints;
  const multiplier = 1 + rate * correctDnfCount;
  const scaledSubtotal = baseSubtotal * multiplier;
  const dnfMultiplierBonus = scaledSubtotal - baseSubtotal;

  // Net can be negative when wrong DNF picks exceed (scaled) position/FL/pole points.
  const total = scaledSubtotal - Math.abs(dnfPenalty);

  return {
    total,
    breakdown: {
      positionPoints,
      fastestLapPoints,
      polePositionPoints,
      dnfMultiplierApplied: multiplier,
      dnfMultiplierBonus,
      dnfPenalty: -Math.abs(dnfPenalty),
      total,
    },
  };
}
