import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get upcoming races (races with date >= current time)
 * Ordered by date ascending
 */
export const getUpcomingRaces = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const races = await ctx.db
      .query("races")
      .withIndex("by_date", (q) => q.gte("date", now))
      .order("asc")
      .collect();

    // Apply limit if provided
    if (args.limit) {
      return races.slice(0, args.limit);
    }

    return races;
  },
});

/**
 * Get a race by ID
 */
export const getRaceById = query({
  args: {
    raceId: v.id("races"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.raceId);
  },
});

/**
 * Get races for a specific season
 */
export const getRacesBySeason = query({
  args: {
    seasonId: v.id("seasons"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("races")
      .withIndex("by_season", (q) => q.eq("seasonId", args.seasonId))
      .order("asc")
      .collect();
  },
});

/**
 * Get the current season
 */
export const getCurrentSeason = query({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const currentYear = now.getFullYear();

    const season = await ctx.db
      .query("seasons")
      .withIndex("by_year", (q) => q.eq("year", currentYear))
      .first();

    return season;
  },
});

/**
 * Get completed races that don't have results yet
 * Used by scheduled functions to sync results
 */
export const getCompletedRacesWithoutResults = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    // Get races that have passed (date < now) but don't have officialResults
    const races = await ctx.db
      .query("races")
      .withIndex("by_date", (q) => q.lt("date", now))
      .collect();

    // Filter to only races without results
    return races.filter((race) => !race.officialResults);
  },
});
