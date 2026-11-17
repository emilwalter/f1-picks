import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { isLocked } from "../lib/lockout";
import { applyScoringForRoomRace } from "../lib/applyRoomRaceScoring";
import { RACE_RULE_KINDS, raceRuleValidator } from "../lib/raceRules";

/**
 * Set the extra rules for one race in a room. Host-only.
 *
 * Rules freeze when picks lock: the host is usually a player too, so changing
 * the rules after seeing the field (or the result) is not allowed.
 */
export const setRaceRules = mutation({
  args: {
    roomId: v.id("rooms"),
    raceId: v.id("races"),
    rules: v.array(raceRuleValidator),
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

    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_provider_id", (q) =>
        q.eq("authProviderId", identity.subject)
      )
      .first();
    if (!user || user._id !== room.hostId) {
      throw new Error("Only the host can change race rules");
    }

    const race = await ctx.db.get(args.raceId);
    if (!race) {
      throw new Error("Race not found");
    }
    if (race.seasonId !== room.seasonId) {
      throw new Error("Race does not belong to this room's season");
    }
    if (isLocked(room, race)) {
      throw new Error("Rules are locked: picks for this race have closed");
    }

    // One entry per kind, in a stable order.
    const kinds = new Set(args.rules.map((r) => r.kind));
    const rules = RACE_RULE_KINDS.filter((k) => kinds.has(k)).map((kind) => ({
      kind,
    }));

    const existing = await ctx.db
      .query("raceRules")
      .withIndex("by_room_race", (q) =>
        q.eq("roomId", args.roomId).eq("raceId", args.raceId)
      )
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        rules,
        updatedBy: user._id,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("raceRules", {
        roomId: args.roomId,
        raceId: args.raceId,
        rules,
        updatedBy: user._id,
        updatedAt: now,
      });
    }

    // Only reachable during a host unlock window after results synced.
    if (race.officialResults) {
      await applyScoringForRoomRace(ctx, {
        roomId: args.roomId,
        raceId: args.raceId,
      });
    }

    return rules;
  },
});
