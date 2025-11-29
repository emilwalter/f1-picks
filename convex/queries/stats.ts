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
    // Get all rooms for this season
    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_season", (q) => q.eq("seasonId", args.seasonId))
      .collect();

    // Get all races for this season
    const races = await ctx.db
      .query("races")
      .withIndex("by_season", (q) => q.eq("seasonId", args.seasonId))
      .collect();

    // Get user's cumulative scores across all races in rooms they participate in
    const userRooms = await Promise.all(
      rooms.map(async (room) => {
        const participant = await ctx.db
          .query("roomParticipants")
          .withIndex("by_room_user", (q) =>
            q.eq("roomId", room._id).eq("userId", args.userId),
          )
          .first();
        return participant ? room : null;
      }),
    );

    const validUserRooms = userRooms.filter((r) => r !== null);

    // Get all scores for user across all races in their rooms
    const allScores = await Promise.all(
      validUserRooms.flatMap((room) =>
        races.map(async (race) => {
          return await ctx.db
            .query("scores")
            .withIndex("by_room_race_user", (q) =>
              q
                .eq("roomId", room!._id)
                .eq("raceId", race._id)
                .eq("userId", args.userId),
            )
            .first();
        }),
      ),
    );

    const validScores = allScores.filter((s) => s !== null);

    // Calculate statistics
    const totalPoints = validScores.reduce(
      (sum, score) => sum + score!.points,
      0,
    );
    const averagePoints =
      validScores.length > 0 ? totalPoints / validScores.length : 0;
    const racesParticipated = validScores.length;
    const roomsParticipated = validUserRooms.length;

    return {
      userId: args.userId,
      seasonId: args.seasonId,
      totalPoints,
      averagePoints,
      racesParticipated,
      roomsParticipated,
      totalRooms: rooms.length,
      totalRaces: races.length,
    };
  },
});
