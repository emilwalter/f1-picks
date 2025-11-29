import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get a room by ID
 */
export const getRoom = query({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.roomId);
  },
});

/**
 * Get all participants in a room
 */
export const getRoomParticipants = query({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const participants = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    // Fetch user details for each participant
    const participantsWithUsers = await Promise.all(
      participants.map(async (participant) => {
        const user = await ctx.db.get(participant.userId);
        return {
          ...participant,
          user,
        };
      }),
    );

    return participantsWithUsers;
  },
});

/**
 * Get active rooms for a user (rooms where user is a participant and status is 'open' or 'locked')
 */
export const getUserActiveRooms = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const participants = await ctx.db
      .query("roomParticipants")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Get rooms for these participants
    const rooms = await Promise.all(
      participants.map((p) => ctx.db.get(p.roomId)),
    );

    // Filter to only active rooms (open or locked)
    const activeRooms = rooms.filter(
      (room) => room && (room.status === "open" || room.status === "locked"),
    );

    // Fetch race details for each room
    const roomsWithRaces = await Promise.all(
      activeRooms.map(async (room) => {
        const race = room ? await ctx.db.get(room.raceId) : null;
        return {
          room,
          race,
        };
      }),
    );

    return roomsWithRaces.filter((r) => r.room !== null);
  },
});

/**
 * Get rooms for a specific race
 */
export const getRoomsByRace = query({
  args: {
    raceId: v.id("races"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("rooms")
      .withIndex("by_race", (q) => q.eq("raceId", args.raceId))
      .order("desc")
      .collect();
  },
});

/**
 * Get a room by join code
 */
export const getRoomByJoinCode = query({
  args: {
    joinCode: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("rooms")
      .withIndex("by_join_code", (q) => q.eq("joinCode", args.joinCode))
      .first();
  },
});
