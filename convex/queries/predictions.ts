import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get a user's prediction for a specific room
 */
export const getUserPrediction = query({
  args: {
    roomId: v.id("rooms"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("predictions")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", args.userId),
      )
      .first();
  },
});

/**
 * Get all predictions for a room
 */
export const getRoomPredictions = query({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const predictions = await ctx.db
      .query("predictions")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    // Fetch user details for each prediction
    const predictionsWithUsers = await Promise.all(
      predictions.map(async (prediction) => {
        const user = await ctx.db.get(prediction.userId);
        return {
          ...prediction,
          user,
        };
      }),
    );

    return predictionsWithUsers;
  },
});
