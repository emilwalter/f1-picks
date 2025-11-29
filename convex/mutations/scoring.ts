import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

/**
 * Apply official race results and calculate scores for all participants
 */
export const applyRaceResults = mutation({
  args: {
    roomId: v.id("rooms"),
    officialResults: v.object({
      positions: v.array(
        v.object({
          position: v.number(),
          driverNumber: v.number(),
          points: v.number(),
        }),
      ),
      fastestLapDriverId: v.optional(v.number()),
      polePositionDriverId: v.optional(v.number()),
      dnfDriverIds: v.array(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get room
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    // Get or create user
    const authProviderId = identity.subject;
    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_provider_id", (q) =>
        q.eq("authProviderId", authProviderId),
      )
      .first();

    if (!user || user._id !== room.hostId) {
      throw new Error("Only the host can apply race results");
    }

    if (room.status === "scored") {
      throw new Error("Results have already been applied to this room");
    }

    // Update race with official results
    const race = await ctx.db.get(room.raceId);
    if (race) {
      await ctx.db.patch(room.raceId, {
        officialResults: args.officialResults,
        updatedAt: Date.now(),
      });
    }

    // Get all predictions for this room
    const predictions = await ctx.db
      .query("predictions")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    // Calculate scores for each prediction
    const now = Date.now();
    for (const prediction of predictions) {
      const score = calculateScore(
        prediction,
        args.officialResults,
        room.scoringConfig,
      );

      // Check if score already exists
      const existingScore = await ctx.db
        .query("scores")
        .withIndex("by_room_user", (q) =>
          q.eq("roomId", args.roomId).eq("userId", prediction.userId),
        )
        .first();

      if (existingScore) {
        // Update existing score
        await ctx.db.patch(existingScore._id, {
          points: score.total,
          breakdown: score.breakdown,
          calculatedAt: now,
        });
      } else {
        // Create new score
        await ctx.db.insert("scores", {
          roomId: args.roomId,
          userId: prediction.userId,
          points: score.total,
          breakdown: score.breakdown,
          calculatedAt: now,
        });
      }
    }

    // Update room status to 'scored'
    await ctx.db.patch(args.roomId, {
      status: "scored",
      updatedAt: now,
    });

    return args.roomId;
  },
});

/**
 * Calculate score for a prediction based on official results
 */
function calculateScore(
  prediction: {
    predictedPositions: Array<{ position: number; driverNumber: number }>;
    fastestLapDriverId?: number;
    polePositionDriverId?: number;
    dnfDriverIds: number[];
  },
  officialResults: {
    positions: Array<{ position: number; driverNumber: number }>;
    fastestLapDriverId?: number;
    polePositionDriverId?: number;
    dnfDriverIds: number[];
  },
  scoringConfig: {
    positionPoints: number[];
    fastestLapPoints: number;
    polePositionPoints: number;
    dnfPenalty: number;
  },
): {
  total: number;
  breakdown: {
    positionPoints: number;
    fastestLapPoints: number;
    polePositionPoints: number;
    dnfPenalty: number;
    total: number;
  };
} {
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

  // Count correct DNF predictions
  let correctDnfCount = 0;
  predictedDnfSet.forEach((driverId) => {
    if (actualDnfSet.has(driverId)) {
      correctDnfCount++;
    }
  });

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
