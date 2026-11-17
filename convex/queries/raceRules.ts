import { query } from "../_generated/server";
import { v } from "convex/values";

/** Active extra rules for one race in a room. Empty when the race uses normal scoring. */
export const getRaceRules = query({
  args: {
    roomId: v.id("rooms"),
    raceId: v.id("races"),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("raceRules")
      .withIndex("by_room_race", (q) =>
        q.eq("roomId", args.roomId).eq("raceId", args.raceId)
      )
      .first();
    return row?.rules ?? [];
  },
});

/** Race ids in a room that have at least one extra rule, for badges on race cards. */
export const getRoomRacesWithRules = query({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("raceRules")
      .withIndex("by_room_race", (q) => q.eq("roomId", args.roomId))
      .collect();
    return rows.filter((r) => r.rules.length > 0).map((r) => r.raceId);
  },
});
