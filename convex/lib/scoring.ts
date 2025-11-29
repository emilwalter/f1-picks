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
  dnfPenalty: number;
}

export interface ScoreBreakdown {
  positionPoints: number;
  fastestLapPoints: number;
  polePositionPoints: number;
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
  scoringConfig: ScoringConfig,
): ScoreResult {
  let positionPoints = 0;
  let fastestLapPoints = 0;
  let polePositionPoints = 0;
  let dnfPenalty = 0;

  // Calculate position points
  // Create a map of predicted positions by driver number
  const predictedMap = new Map<number, number>();
  prediction.predictedPositions.forEach((pred) => {
    predictedMap.set(pred.driverNumber, pred.position);
  });

  // Create a map of actual positions by driver number
  const actualMap = new Map<number, number>();
  officialResults.positions.forEach((result) => {
    actualMap.set(result.driverNumber, result.position);
  });

  // Compare predictions with actual results
  prediction.predictedPositions.forEach((pred) => {
    const actualPosition = actualMap.get(pred.driverNumber);
    if (actualPosition !== undefined) {
      const positionDiff = Math.abs(pred.position - actualPosition);
      // Award points based on how close the prediction was
      // If exact match, award full points for that position
      // If off by 1, award points for the position they predicted
      // If off by more, award reduced points
      if (positionDiff === 0) {
        // Exact match - award points for the position
        const pointsIndex = Math.min(
          pred.position - 1,
          scoringConfig.positionPoints.length - 1,
        );
        positionPoints += scoringConfig.positionPoints[pointsIndex] || 0;
      } else if (positionDiff === 1) {
        // Off by 1 - award half points
        const pointsIndex = Math.min(
          pred.position - 1,
          scoringConfig.positionPoints.length - 1,
        );
        positionPoints +=
          (scoringConfig.positionPoints[pointsIndex] || 0) * 0.5;
      }
      // Off by more than 1 - no points
    }
  });

  // Check fastest lap
  if (
    prediction.fastestLapDriverId !== undefined &&
    prediction.fastestLapDriverId === officialResults.fastestLapDriverId
  ) {
    fastestLapPoints = scoringConfig.fastestLapPoints;
  }

  // Check pole position
  if (
    prediction.polePositionDriverId !== undefined &&
    prediction.polePositionDriverId === officialResults.polePositionDriverId
  ) {
    polePositionPoints = scoringConfig.polePositionPoints;
  }

  // Check DNF predictions
  const predictedDnfSet = new Set(prediction.dnfDriverIds);
  const actualDnfSet = new Set(officialResults.dnfDriverIds);

  // Count incorrect DNF predictions (predicted but didn't DNF)
  let incorrectDnfCount = 0;
  predictedDnfSet.forEach((driverId) => {
    if (!actualDnfSet.has(driverId)) {
      incorrectDnfCount++;
    }
  });

  // Apply DNF penalty for incorrect predictions
  dnfPenalty = incorrectDnfCount * scoringConfig.dnfPenalty;

  const total =
    positionPoints +
    fastestLapPoints +
    polePositionPoints -
    Math.abs(dnfPenalty);

  return {
    total: Math.max(0, total), // Ensure non-negative
    breakdown: {
      positionPoints,
      fastestLapPoints,
      polePositionPoints,
      dnfPenalty: -Math.abs(dnfPenalty), // Store as negative
      total: Math.max(0, total),
    },
  };
}
