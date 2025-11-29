import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { calculateScore } from "../lib/scoring";

/**
 * Internal mutation to apply scoring for a room and race
 * Called automatically by scheduled functions, doesn't require authentication
 */
export const applyScoringForRoom = internalMutation({
  args: {
    roomId: v.id("rooms"),
    raceId: v.id("races"),
  },
  handler: async (ctx, args) => {
    // Get room and race
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    const race = await ctx.db.get(args.raceId);
    if (!race) {
      throw new Error("Race not found");
    }

    if (!race.officialResults) {
      throw new Error("Race results not available");
    }

    if (race.seasonId !== room.seasonId) {
      throw new Error("Race does not belong to this room's season");
    }

    // Get all predictions for this room and race
    const predictions = await ctx.db
      .query("predictions")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect()
      .then((preds) => preds.filter((p) => p.raceId === args.raceId));

    // Calculate scores for each prediction
    const now = Date.now();
    let scoresCreated = 0;
    let scoresUpdated = 0;

    // Ensure officialResults has required fields (dnfDriverIds must be an array, not optional)
    const officialResults = {
      positions: race.officialResults!.positions,
      fastestLapDriverId: race.officialResults!.fastestLapDriverId,
      polePositionDriverId: race.officialResults!.polePositionDriverId,
      dnfDriverIds: race.officialResults!.dnfDriverIds ?? [],
    };

    for (const prediction of predictions) {
      const score = calculateScore(
        prediction,
        officialResults,
        room.scoringConfig,
      );

      // Check if score already exists for this race
      const existingScore = await ctx.db
        .query("scores")
        .withIndex("by_room_race_user", (q) =>
          q
            .eq("roomId", args.roomId)
            .eq("raceId", args.raceId)
            .eq("userId", prediction.userId),
        )
        .first();

      if (existingScore) {
        // Update existing score
        await ctx.db.patch(existingScore._id, {
          points: score.total,
          breakdown: score.breakdown,
          calculatedAt: now,
        });
        scoresUpdated++;
      } else {
        // Create new score for this race
        await ctx.db.insert("scores", {
          roomId: args.roomId,
          raceId: args.raceId,
          userId: prediction.userId,
          points: score.total,
          breakdown: score.breakdown,
          calculatedAt: now,
        });
        scoresCreated++;
      }
    }

    return {
      roomId: args.roomId,
      raceId: args.raceId,
      scoresCreated,
      scoresUpdated,
      totalPredictions: predictions.length,
    };
  },
});
