import { mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Create a new season
 */
export const createSeason = mutation({
  args: {
    year: v.number(),
    totalRaces: v.number(),
    currentRound: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("seasons", {
      year: args.year,
      totalRaces: args.totalRaces,
      currentRound: args.currentRound,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update a season
 */
export const updateSeason = mutation({
  args: {
    seasonId: v.id("seasons"),
    totalRaces: v.optional(v.number()),
    currentRound: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.totalRaces !== undefined) {
      updates.totalRaces = args.totalRaces;
    }

    if (args.currentRound !== undefined) {
      updates.currentRound = args.currentRound;
    }

    await ctx.db.patch(args.seasonId, updates);
    return args.seasonId;
  },
});
