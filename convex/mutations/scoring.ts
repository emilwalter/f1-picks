import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { applyScoringForRoomRace } from "../lib/applyRoomRaceScoring";

/**
 * Apply official race results and calculate scores for all participants for a specific race
 */
export const applyRaceResults = mutation({
  args: {
    roomId: v.id("rooms"),
    raceId: v.id("races"),
    officialResults: v.object({
      positions: v.array(
        v.object({
          position: v.number(),
          driverNumber: v.number(),
          points: v.number(),
        })
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

    // Get room
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    // Verify race belongs to room's season
    const race = await ctx.db.get(args.raceId);
    if (!race) {
      throw new Error("Race not found");
    }

    if (race.seasonId !== room.seasonId) {
      throw new Error("Race does not belong to this room's season");
    }

    // Get or create user
    const authProviderId = identity.subject;
    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_provider_id", (q) =>
        q.eq("authProviderId", authProviderId)
      )
      .first();

    if (!user || user._id !== room.hostId) {
      throw new Error("Only the host can apply race results");
    }

    // Check if results already applied for this race
    if (race.officialResults) {
      throw new Error("Results have already been applied for this race");
    }

    // Update race with official results
    await ctx.db.patch(args.raceId, {
      officialResults: args.officialResults,
      updatedAt: Date.now(),
    });

    // Score with the same path as scheduled sync, so per-race rules apply.
    await applyScoringForRoomRace(ctx, {
      roomId: args.roomId,
      raceId: args.raceId,
    });

    return args.raceId;
  },
});
