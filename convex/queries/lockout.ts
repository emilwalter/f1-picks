import { query } from "../_generated/server";
import { v } from "convex/values";
import {
  calculateLockoutTime,
  getTimeUntilLockout,
  isLocked,
} from "../lib/lockout";

/**
 * Get lockout information for a room
 * Returns the lockout timestamp, time until lockout, and whether it's currently locked
 */
export const getRoomLockoutInfo = query({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      return null;
    }

    const race = await ctx.db.get(room.raceId);
    const lockoutTime = calculateLockoutTime(room, race);
    const timeUntilLockout = getTimeUntilLockout(room, race);
    const locked = isLocked(room, race);

    return {
      lockoutTime,
      timeUntilLockout,
      locked,
      lockoutConfig: room.lockoutConfig,
      roomStatus: room.status,
    };
  },
});
