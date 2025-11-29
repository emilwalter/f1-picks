import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { ensureUser } from "../lib/userHelpers";
import { isLocked } from "../lib/lockout";

/**
 * Submit a prediction for a room
 */
export const submitPrediction = mutation({
  args: {
    roomId: v.id("rooms"),
    prediction: v.object({
      predictedPositions: v.array(
        v.object({
          position: v.number(),
          driverNumber: v.number(),
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

    // Ensure user exists in Convex (for relationships)
    const userId = await ensureUser(ctx);
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("Failed to get user");
    }

    // Verify room exists and is open
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    // Get race to check lockout times
    const race = await ctx.db.get(room.raceId);

    // Check if predictions are locked
    if (isLocked(room, race)) {
      if (
        room.status === "locked" ||
        room.status === "scored" ||
        room.status === "archived"
      ) {
        throw new Error("Room is not accepting predictions");
      }
      throw new Error("Prediction lockout time has passed");
    }

    // Check if user is a participant
    const participant = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", user._id),
      )
      .first();

    if (!participant) {
      throw new Error("You must join the room before submitting a prediction");
    }

    // Check if prediction already exists
    const existingPrediction = await ctx.db
      .query("predictions")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", user._id),
      )
      .first();

    const now = Date.now();

    if (existingPrediction) {
      // Update existing prediction
      await ctx.db.patch(existingPrediction._id, {
        predictedPositions: args.prediction.predictedPositions,
        fastestLapDriverId: args.prediction.fastestLapDriverId,
        polePositionDriverId: args.prediction.polePositionDriverId,
        dnfDriverIds: args.prediction.dnfDriverIds,
        updatedAt: now,
      });
      return existingPrediction._id;
    } else {
      // Create new prediction
      const predictionId = await ctx.db.insert("predictions", {
        roomId: args.roomId,
        userId: user._id,
        predictedPositions: args.prediction.predictedPositions,
        fastestLapDriverId: args.prediction.fastestLapDriverId,
        polePositionDriverId: args.prediction.polePositionDriverId,
        dnfDriverIds: args.prediction.dnfDriverIds,
        submittedAt: now,
        updatedAt: now,
      });
      return predictionId;
    }
  },
});

/**
 * Update an existing prediction
 */
export const updatePrediction = mutation({
  args: {
    predictionId: v.id("predictions"),
    prediction: v.object({
      predictedPositions: v.array(
        v.object({
          position: v.number(),
          driverNumber: v.number(),
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

    // Get user from Clerk identity
    const authProviderId = identity.subject;
    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_provider_id", (q) =>
        q.eq("authProviderId", authProviderId),
      )
      .first();

    if (!user) {
      throw new Error("User not found. Please join a room first.");
    }

    // Get prediction
    const prediction = await ctx.db.get(args.predictionId);
    if (!prediction) {
      throw new Error("Prediction not found");
    }

    // Verify user owns this prediction
    if (prediction.userId !== user._id) {
      throw new Error("You can only update your own predictions");
    }

    // Verify room is still open
    const room = await ctx.db.get(prediction.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    // Get race to check lockout times
    const race = await ctx.db.get(room.raceId);

    // Check if predictions are locked
    if (isLocked(room, race)) {
      if (
        room.status === "locked" ||
        room.status === "scored" ||
        room.status === "archived"
      ) {
        throw new Error("Room is not accepting prediction updates");
      }
      throw new Error("Prediction lockout time has passed");
    }

    // Update prediction
    await ctx.db.patch(args.predictionId, {
      predictedPositions: args.prediction.predictedPositions,
      fastestLapDriverId: args.prediction.fastestLapDriverId,
      polePositionDriverId: args.prediction.polePositionDriverId,
      dnfDriverIds: args.prediction.dnfDriverIds,
      updatedAt: Date.now(),
    });

    return args.predictionId;
  },
});
