import { mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Create a new race
 */
export const createRace = mutation({
  args: {
    seasonId: v.id("seasons"),
    round: v.number(),
    name: v.string(),
    date: v.number(),
    circuit: v.string(),
    location: v.string(),
    country: v.string(),
    sessionTimes: v.optional(
      v.object({
        fp1: v.optional(v.object({ start: v.number(), end: v.number() })),
        fp2: v.optional(v.object({ start: v.number(), end: v.number() })),
        fp3: v.optional(v.object({ start: v.number(), end: v.number() })),
        qualifying: v.optional(
          v.object({ start: v.number(), end: v.number() }),
        ),
        race: v.optional(v.object({ start: v.number(), end: v.number() })),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("races", {
      seasonId: args.seasonId,
      round: args.round,
      name: args.name,
      date: args.date,
      circuit: args.circuit,
      location: args.location,
      country: args.country,
      sessionTimes: args.sessionTimes,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update session times for a race
 */
export const updateSessionTimes = mutation({
  args: {
    raceId: v.id("races"),
    sessionTimes: v.object({
      fp1: v.optional(v.object({ start: v.number(), end: v.number() })),
      fp2: v.optional(v.object({ start: v.number(), end: v.number() })),
      fp3: v.optional(v.object({ start: v.number(), end: v.number() })),
      qualifying: v.optional(v.object({ start: v.number(), end: v.number() })),
      race: v.optional(v.object({ start: v.number(), end: v.number() })),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.raceId, {
      sessionTimes: args.sessionTimes,
      updatedAt: Date.now(),
    });
    return args.raceId;
  },
});

/**
 * Update race results
 */
export const updateRaceResults = mutation({
  args: {
    raceId: v.id("races"),
    officialResults: v.object({
      positions: v.array(
        v.object({
          position: v.number(),
          driverNumber: v.number(),
          points: v.number(),
        }),
      ),
      fastestLapDriverId: v.optional(v.number()),
      polePositionDriverId: v.optional(v.number()),
      dnfDriverIds: v.array(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.raceId, {
      officialResults: args.officialResults,
      updatedAt: Date.now(),
    });
    return args.raceId;
  },
});
