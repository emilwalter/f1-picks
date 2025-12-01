import { query } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";

/**
 * Get the cumulative leaderboard for a room across all races, ordered by total points descending
 */
export const getRoomLeaderboard = query({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    // Get all scores for this room (across all races)
    const scores = await ctx.db
      .query("scores")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    // Aggregate scores by user (cumulative across all races)
    const userTotals = new Map<
      string,
      { userId: string; totalPoints: number; raceCount: number }
    >();

    for (const score of scores) {
      const userId = score.userId;
      const existing = userTotals.get(userId);
      if (existing) {
        existing.totalPoints += score.points;
        existing.raceCount += 1;
      } else {
        userTotals.set(userId, {
          userId,
          totalPoints: score.points,
          raceCount: 1,
        });
      }
    }

    // Convert to array and fetch user details
    const leaderboard = await Promise.all(
      Array.from(userTotals.values())
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .map(async (entry) => {
          const user = await ctx.db.get(entry.userId as Id<"users">);
          return {
            _id: entry.userId,
            roomId: args.roomId,
            userId: entry.userId,
            points: entry.totalPoints,
            breakdown: {
              positionPoints: 0,
              fastestLapPoints: 0,
              polePositionPoints: 0,
              dnfPenalty: 0,
              total: entry.totalPoints,
            },
            calculatedAt: Date.now(),
            user,
          };
        })
    );

    return leaderboard;
  },
});

/**
 * Get the leaderboard for a specific race within a room
 */
export const getRoomRaceLeaderboard = query({
  args: {
    roomId: v.id("rooms"),
    raceId: v.id("races"),
  },
  handler: async (ctx, args) => {
    // Get all scores for this room and race
    const scores = await ctx.db
      .query("scores")
      .withIndex("by_room_race_user", (q) =>
        q.eq("roomId", args.roomId).eq("raceId", args.raceId)
      )
      .collect();

    // Fetch user details and format leaderboard
    const leaderboard = await Promise.all(
      scores
        .sort((a, b) => b.points - a.points)
        .map(async (score) => {
          const user = await ctx.db.get(score.userId);
          return {
            _id: score._id,
            roomId: score.roomId,
            userId: score.userId,
            points: score.points,
            breakdown: score.breakdown,
            calculatedAt: score.calculatedAt,
            user,
          };
        })
    );

    return leaderboard;
  },
});
