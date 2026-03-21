import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

const driverEntryValidator = v.object({
  driverNumber: v.number(),
  name: v.string(),
  teamName: v.string(),
  teamLogo: v.optional(v.string()),
  countryCode: v.string(),
});

export const getByYear = internalQuery({
  args: { year: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("driverSeasonCache")
      .withIndex("by_year", (q) => q.eq("year", args.year))
      .first();
  },
});

export const upsert = internalMutation({
  args: {
    year: v.number(),
    drivers: v.array(driverEntryValidator),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("driverSeasonCache")
      .withIndex("by_year", (q) => q.eq("year", args.year))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        drivers: args.drivers,
        updatedAt: args.updatedAt,
      });
    } else {
      await ctx.db.insert("driverSeasonCache", {
        year: args.year,
        drivers: args.drivers,
        updatedAt: args.updatedAt,
      });
    }
  },
});
