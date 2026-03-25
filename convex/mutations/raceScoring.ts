import { internalMutation, mutation } from "../_generated/server";
import { v } from "convex/values";
import { applyScoringForRoomRace } from "../lib/applyRoomRaceScoring";

/**
 * Internal mutation to apply scoring for a room and race
 * Called automatically by scheduled functions, doesn't require authentication
 */
export const applyScoringForRoom = internalMutation({
  args: {
    roomId: v.id("rooms"),
    raceId: v.id("races"),
  },
  handler: async (ctx, args) => {
    return applyScoringForRoomRace(ctx, args);
  },
});

/**
 * Re-run scoring for every race in this room that already has official results.
 * Host-only. Use after changing scoring rules (e.g. DNF bonuses) so the leaderboard updates.
 */
export const recalculateRoomScores = mutation({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    const authProviderId = identity.subject;
    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_provider_id", (q) =>
        q.eq("authProviderId", authProviderId)
      )
      .first();

    if (!user || user._id !== room.hostId) {
      throw new Error("Only the host can recalculate scores");
    }

    const races = await ctx.db
      .query("races")
      .withIndex("by_season", (q) => q.eq("seasonId", room.seasonId))
      .collect();

    const withResults = races.filter((r) => r.officialResults !== undefined);
    let racesProcessed = 0;
    let scoresCreated = 0;
    let scoresUpdated = 0;

    for (const race of withResults) {
      const result = await applyScoringForRoomRace(ctx, {
        roomId: args.roomId,
        raceId: race._id,
      });
      racesProcessed++;
      scoresCreated += result.scoresCreated;
      scoresUpdated += result.scoresUpdated;
    }

    return {
      roomId: args.roomId,
      racesProcessed,
      scoresCreated,
      scoresUpdated,
    };
  },
});
