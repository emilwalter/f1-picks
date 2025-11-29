import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get the leaderboard for a room, ordered by points descending
 */
export const getRoomLeaderboard = query({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const scores = await ctx.db
      .query("scores")
      .withIndex("by_room_points", (q) => q.eq("roomId", args.roomId))
      .order("desc")
      .collect();

    // Fetch user details for each score
    const leaderboard = await Promise.all(
      scores.map(async (score) => {
        const user = await ctx.db.get(score.userId);
        return {
          ...score,
          user,
        };
      }),
    );

    // Sort by points descending (index should handle this, but ensure it)
    leaderboard.sort((a, b) => b.points - a.points);

    return leaderboard;
  },
});
