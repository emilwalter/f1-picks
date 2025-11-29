import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get user statistics for a specific season
 */
export const getUserSeasonStats = query({
  args: {
    userId: v.id("users"),
    seasonId: v.id("seasons"),
  },
  handler: async (ctx, args) => {
    // Get all rooms for races in this season
    const races = await ctx.db
      .query("races")
      .withIndex("by_season", (q) => q.eq("seasonId", args.seasonId))
      .collect();

    const raceIds = races.map((r) => r._id);

    // Get all rooms for these races
    const rooms = await Promise.all(
      raceIds.map(async (raceId) => {
        return await ctx.db
          .query("rooms")
          .withIndex("by_race", (q) => q.eq("raceId", raceId))
          .collect();
      }),
    );

    const allRooms = rooms.flat();

    // Get user's scores for these rooms
    const scores = await Promise.all(
      allRooms.map(async (room) => {
        return await ctx.db
          .query("scores")
          .withIndex("by_room_user", (q) =>
            q.eq("roomId", room._id).eq("userId", args.userId),
          )
          .first();
      }),
    );

    const validScores = scores.filter((s) => s !== null);

    // Calculate statistics
    const totalPoints = validScores.reduce(
      (sum, score) => sum + score!.points,
      0,
    );
    const averagePoints =
      validScores.length > 0 ? totalPoints / validScores.length : 0;
    const roomsParticipated = validScores.length;
    const roomsWon = validScores.filter((score) => {
      // Check if this user has the highest score in the room
      // This is a simplified check - in production, you might want to cache this
      return score!.points > 0; // Placeholder logic
    }).length;

    return {
      userId: args.userId,
      seasonId: args.seasonId,
      totalPoints,
      averagePoints,
      roomsParticipated,
      roomsWon,
      totalRooms: allRooms.length,
    };
  },
});
