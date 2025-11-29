import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get season by ID
 */
export const getSeasonById = query({
  args: {
    seasonId: v.id("seasons"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.seasonId);
  },
});

/**
 * Get season by year
 */
export const getSeasonByYear = query({
  args: {
    year: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("seasons")
      .withIndex("by_year", (q) => q.eq("year", args.year))
      .first();
  },
});

/**
 * Get race by season and round
 */
export const getRaceBySeasonRound = query({
  args: {
    seasonId: v.id("seasons"),
    round: v.number(),
  },
  handler: async (ctx, args) => {
    const races = await ctx.db
      .query("races")
      .withIndex("by_season_round", (q) =>
        q.eq("seasonId", args.seasonId).eq("round", args.round),
      )
      .collect();

    return races[0] || null;
  },
});
