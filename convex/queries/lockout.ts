import { query } from "../_generated/server";
import { v } from "convex/values";
import {
  calculateLockoutTime,
  getTimeUntilLockout,
  isLocked,
} from "../lib/lockout";

/**
 * Get lockout information for a room and specific race
 * Returns the lockout timestamp, time until lockout, and whether it's currently locked
 */
export const getRoomLockoutInfo = query({
  args: {
    roomId: v.id("rooms"),
    raceId: v.id("races"),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      return null;
    }

    const race = await ctx.db.get(args.raceId);
    if (!race) {
      return null;
    }

    // Verify race belongs to room's season
    if (race.seasonId !== room.seasonId) {
      return null;
    }

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
