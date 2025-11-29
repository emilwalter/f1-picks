import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { calculateScore } from "../lib/scoring";

/**
 * Apply official race results and calculate scores for all participants for a specific race
 */
export const applyRaceResults = mutation({
  args: {
    roomId: v.id("rooms"),
    raceId: v.id("races"),
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

    // Verify race belongs to room's season
    const race = await ctx.db.get(args.raceId);
    if (!race) {
      throw new Error("Race not found");
    }

    if (race.seasonId !== room.seasonId) {
      throw new Error("Race does not belong to this room's season");
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

    // Check if results already applied for this race
    if (race.officialResults) {
      throw new Error("Results have already been applied for this race");
    }

    // Update race with official results
    await ctx.db.patch(args.raceId, {
      officialResults: args.officialResults,
      updatedAt: Date.now(),
    });

    // Get all predictions for this room and race
    const predictions = await ctx.db
      .query("predictions")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect()
      .then((preds) => preds.filter((p) => p.raceId === args.raceId));

    // Calculate scores for each prediction
    const now = Date.now();
    for (const prediction of predictions) {
      const score = calculateScore(
        prediction,
        args.officialResults,
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
      }
    }

    return args.raceId;
  },
});
