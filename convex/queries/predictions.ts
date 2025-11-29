import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get a user's prediction for a specific race within a room
 */
export const getUserPrediction = query({
  args: {
    roomId: v.id("rooms"),
    raceId: v.id("races"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("predictions")
      .withIndex("by_room_race_user", (q) =>
        q
          .eq("roomId", args.roomId)
          .eq("raceId", args.raceId)
          .eq("userId", args.userId),
      )
      .first();
  },
});

/**
 * Get all of a user's predictions for a room (across all races)
 */
export const getUserRoomPredictions = query({
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
      .collect();
  },
});

/**
 * Get all predictions for a specific race within a room
 */
export const getRoomRacePredictions = query({
  args: {
    roomId: v.id("rooms"),
    raceId: v.id("races"),
  },
  handler: async (ctx, args) => {
    const predictions = await ctx.db
      .query("predictions")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect()
      .then((preds) => preds.filter((p) => p.raceId === args.raceId));

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

/**
 * Get all predictions for a room, grouped by race
 * Returns a map of raceId -> array of predictions with user details
 */
export const getRoomPredictionsByRace = query({
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

    // Group by raceId
    const groupedByRace: Record<string, typeof predictionsWithUsers> = {};
    for (const prediction of predictionsWithUsers) {
      const raceId = prediction.raceId;
      if (!groupedByRace[raceId]) {
        groupedByRace[raceId] = [];
      }
      groupedByRace[raceId].push(prediction);
    }

    return groupedByRace;
  },
});
