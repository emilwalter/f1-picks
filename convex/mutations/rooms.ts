import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { ensureUser } from "../lib/userHelpers";

/**
 * Create a new prediction room for a season
 */
export const createRoom = mutation({
  args: {
    seasonId: v.id("seasons"),
    name: v.optional(v.string()),
    lockoutConfig: v.union(
      v.object({
        type: v.literal("before_session"),
        session: v.union(
          v.literal("fp1"),
          v.literal("fp2"),
          v.literal("fp3"),
          v.literal("qualifying"),
          v.literal("race")
        ),
      }),
      v.object({
        type: v.literal("before_session_end"),
        session: v.union(
          v.literal("fp1"),
          v.literal("fp2"),
          v.literal("fp3"),
          v.literal("qualifying")
        ),
      }),
      v.object({
        type: v.literal("custom"),
        hoursBeforeRace: v.number(),
      })
    ),
    scoringConfig: v.object({
      positionPoints: v.array(v.number()),
      fastestLapPoints: v.number(),
      polePositionPoints: v.number(),
      dnfPenalty: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Ensure user exists in Convex (for relationships)
    const userId = await ensureUser(ctx);
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("Failed to get user");
    }

    // Verify season exists
    const season = await ctx.db.get(args.seasonId);
    if (!season) {
      throw new Error("Season not found");
    }

    // Generate a unique join code (6 characters, alphanumeric)
    const joinCode = generateJoinCode();

    const now = Date.now();
    const roomId = await ctx.db.insert("rooms", {
      hostId: user._id,
      seasonId: args.seasonId,
      name: args.name,
      lockoutConfig: args.lockoutConfig,
      scoringConfig: args.scoringConfig,
      status: "open",
      joinCode,
      createdAt: now,
      updatedAt: now,
    });

    // Add host as a participant
    await ctx.db.insert("roomParticipants", {
      roomId,
      userId: user._id,
      role: "host",
      joinedAt: now,
    });

    return roomId;
  },
});

/**
 * Join a room using a join code
 */
export const joinRoom = mutation({
  args: {
    joinCode: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Ensure user exists in Convex (for relationships)
    const userId = await ensureUser(ctx);
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("Failed to get user");
    }

    // Find room by join code
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_join_code", (q) => q.eq("joinCode", args.joinCode))
      .first();

    if (!room) {
      throw new Error("Room not found");
    }

    if (room.status !== "open") {
      throw new Error("Room is not open for joining");
    }

    // Check if user is already a participant
    const existingParticipant = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", room._id).eq("userId", user._id)
      )
      .first();

    if (existingParticipant) {
      return room._id; // Already a participant
    }

    // Add user as participant
    await ctx.db.insert("roomParticipants", {
      roomId: room._id,
      userId: user._id,
      role: "participant",
      joinedAt: Date.now(),
    });

    return room._id;
  },
});

/**
 * Update room settings (name, lockout config, scoring config)
 * Only the host can update room settings
 */
export const updateRoom = mutation({
  args: {
    roomId: v.id("rooms"),
    name: v.optional(v.string()),
    lockoutConfig: v.optional(
      v.union(
        v.object({
          type: v.literal("before_session"),
          session: v.union(
            v.literal("fp1"),
            v.literal("fp2"),
            v.literal("fp3"),
            v.literal("qualifying"),
            v.literal("race")
          ),
        }),
        v.object({
          type: v.literal("before_session_end"),
          session: v.union(
            v.literal("fp1"),
            v.literal("fp2"),
            v.literal("fp3"),
            v.literal("qualifying")
          ),
        }),
        v.object({
          type: v.literal("custom"),
          hoursBeforeRace: v.number(),
        })
      )
    ),
    scoringConfig: v.optional(
      v.object({
        positionPoints: v.array(v.number()),
        fastestLapPoints: v.number(),
        polePositionPoints: v.number(),
        dnfPenalty: v.number(),
      })
    ),
    status: v.optional(v.union(v.literal("open"), v.literal("archived"))),
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

    // Get user from Clerk identity
    const authProviderId = identity.subject;
    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_provider_id", (q) =>
        q.eq("authProviderId", authProviderId)
      )
      .first();

    if (!user || user._id !== room.hostId) {
      throw new Error("Only the host can update room settings");
    }

    // Build update object with only provided fields
    const updates: {
      name?: string;
      lockoutConfig?: typeof args.lockoutConfig;
      scoringConfig?: typeof args.scoringConfig;
      status?: typeof args.status;
      updatedAt: number;
    } = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      updates.name = args.name.trim() || undefined;
    }
    if (args.lockoutConfig !== undefined) {
      updates.lockoutConfig = args.lockoutConfig;
    }
    if (args.scoringConfig !== undefined) {
      updates.scoringConfig = args.scoringConfig;
    }
    if (args.status !== undefined) {
      updates.status = args.status;
    }

    await ctx.db.patch(args.roomId, updates);

    return args.roomId;
  },
});

/**
 * Archive a room (season ended, room is archived)
 * Note: Lockout is now automatic per-race based on lockoutConfig
 */
export const archiveRoom = mutation({
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

    // Get user from Clerk identity
    const authProviderId = identity.subject;
    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_provider_id", (q) =>
        q.eq("authProviderId", authProviderId)
      )
      .first();

    if (!user || user._id !== room.hostId) {
      throw new Error("Only the host can archive a room");
    }

    if (room.status === "archived") {
      throw new Error("Room is already archived");
    }

    await ctx.db.patch(args.roomId, {
      status: "archived",
      updatedAt: Date.now(),
    });

    return args.roomId;
  },
});

/**
 * Generate a random 6-character alphanumeric join code
 */
function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
