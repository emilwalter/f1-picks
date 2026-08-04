import { mutation } from "../_generated/server";
import { v } from "convex/values";

const sessionTimesValidator = v.object({
  fp1: v.optional(v.object({ start: v.number(), end: v.number() })),
  fp2: v.optional(v.object({ start: v.number(), end: v.number() })),
  fp3: v.optional(v.object({ start: v.number(), end: v.number() })),
  qualifying: v.optional(v.object({ start: v.number(), end: v.number() })),
  race: v.optional(v.object({ start: v.number(), end: v.number() })),
});

/**
 * Create a new race
 */
export const createRace = mutation({
  args: {
    seasonId: v.id("seasons"),
    round: v.number(),
    apiRaceId: v.optional(v.string()),
    name: v.string(),
    date: v.number(),
    circuit: v.string(),
    location: v.string(),
    country: v.string(),
    sessionTimes: v.optional(sessionTimesValidator),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("races", {
      seasonId: args.seasonId,
      round: args.round,
      apiRaceId: args.apiRaceId,
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
    sessionTimes: sessionTimesValidator,
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
 * Patch schedule metadata on an existing race from the upstream calendar.
 *
 * The season sync used to be insert-only, so when f1api.dev changed a race
 * (renumbered rounds, moved a date, added a title sponsor) our row went stale
 * forever. Only the fields passed here are written, so callers send just the
 * drift they detected.
 */
export const updateRaceFromSchedule = mutation({
  args: {
    raceId: v.id("races"),
    apiRaceId: v.optional(v.string()),
    name: v.optional(v.string()),
    date: v.optional(v.number()),
    circuit: v.optional(v.string()),
    location: v.optional(v.string()),
    country: v.optional(v.string()),
    sessionTimes: v.optional(sessionTimesValidator),
  },
  handler: async (ctx, args) => {
    const { raceId, ...fields } = args;
    const patch = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined)
    );

    if (Object.keys(patch).length === 0) {
      return raceId;
    }

    await ctx.db.patch(raceId, { ...patch, updatedAt: Date.now() });
    return raceId;
  },
});

/**
 * Mark a race as cancelled or reinstate it. Host-only: caller must be the host
 * of the room specified by roomId (which also validates the race belongs to
 * the same season).
 */
export const setRaceStatus = mutation({
  args: {
    roomId: v.id("rooms"),
    raceId: v.id("races"),
    status: v.union(v.literal("scheduled"), v.literal("cancelled")),
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
      throw new Error("Only the host can cancel or reinstate races");
    }

    const race = await ctx.db.get(args.raceId);
    if (!race) {
      throw new Error("Race not found");
    }
    if (race.seasonId !== room.seasonId) {
      throw new Error("Race does not belong to this room's season");
    }

    await ctx.db.patch(args.raceId, {
      status: args.status,
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
        })
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
