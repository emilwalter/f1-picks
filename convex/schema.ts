import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    authProviderId: v.string(),
    username: v.string(),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_auth_provider_id", ["authProviderId"])
    .index("by_email", ["email"]),

  seasons: defineTable({
    year: v.number(),
    totalRaces: v.number(),
    currentRound: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_year", ["year"]),

  races: defineTable({
    seasonId: v.id("seasons"),
    round: v.number(),
    name: v.string(),
    date: v.number(), // Unix timestamp (race date)
    circuit: v.string(),
    location: v.string(),
    country: v.string(),
    // Session times from OpenF1 API (for lockout calculations)
    sessionTimes: v.optional(
      v.object({
        fp1: v.optional(v.object({ start: v.number(), end: v.number() })),
        fp2: v.optional(v.object({ start: v.number(), end: v.number() })),
        fp3: v.optional(v.object({ start: v.number(), end: v.number() })),
        qualifying: v.optional(
          v.object({ start: v.number(), end: v.number() })
        ),
        race: v.optional(v.object({ start: v.number(), end: v.number() })),
      })
    ),
    weatherForecast: v.optional(
      v.object({
        condition: v.string(),
        temperature: v.number(),
        humidity: v.number(),
      })
    ),
    // Note: Driver/team info fetched from OpenF1 API on-demand
    // We only store official results for scoring and updates
    officialResults: v.optional(
      v.object({
        positions: v.array(
          v.object({
            position: v.number(),
            driverNumber: v.number(),
            points: v.number(),
          })
        ),
        fastestLapDriverId: v.optional(v.number()),
        polePositionDriverId: v.optional(v.number()),
        dnfDriverIds: v.optional(v.array(v.number())),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_season", ["seasonId"])
    .index("by_season_round", ["seasonId", "round"])
    .index("by_date", ["date"]),

  rooms: defineTable({
    hostId: v.id("users"),
    seasonId: v.id("seasons"), // Room is for a whole season
    name: v.optional(v.string()), // Optional room name
    // Lockout configuration: when predictions should lock for each race
    // This applies to all races in the season
    lockoutConfig: v.union(
      // Lock before a specific session starts
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
      // Lock before a specific session ends
      v.object({
        type: v.literal("before_session_end"),
        session: v.union(
          v.literal("fp1"),
          v.literal("fp2"),
          v.literal("fp3"),
          v.literal("qualifying")
        ),
      }),
      // Custom timestamp offset (e.g., 1 hour before race start)
      v.object({
        type: v.literal("custom"),
        hoursBeforeRace: v.number(), // Hours before race start
      })
    ),
    scoringConfig: v.object({
      positionPoints: v.array(v.number()), // Points for each position (index = position - 1)
      fastestLapPoints: v.number(),
      polePositionPoints: v.number(),
      dnfPenalty: v.number(), // Negative points for incorrect DNF predictions
    }),
    status: v.union(
      v.literal("open"), // Room is active, accepting predictions
      v.literal("archived") // Season ended, room archived
    ),
    joinCode: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_season", ["seasonId"])
    .index("by_host", ["hostId"])
    .index("by_status", ["status"])
    .index("by_join_code", ["joinCode"]),

  roomParticipants: defineTable({
    roomId: v.id("rooms"),
    userId: v.id("users"),
    role: v.union(v.literal("host"), v.literal("participant")),
    joinedAt: v.number(),
  })
    .index("by_room", ["roomId"])
    .index("by_user", ["userId"])
    .index("by_room_user", ["roomId", "userId"]),

  predictions: defineTable({
    roomId: v.id("rooms"),
    raceId: v.id("races"), // Prediction is for a specific race within the room
    userId: v.id("users"),
    predictedPositions: v.array(
      v.object({
        position: v.number(),
        driverNumber: v.number(),
      })
    ),
    fastestLapDriverId: v.optional(v.number()),
    polePositionDriverId: v.optional(v.number()),
    dnfDriverIds: v.array(v.number()),
    submittedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_room", ["roomId"])
    .index("by_race", ["raceId"])
    .index("by_user", ["userId"])
    .index("by_room_user", ["roomId", "userId"])
    .index("by_room_race_user", ["roomId", "raceId", "userId"]),

  scores: defineTable({
    roomId: v.id("rooms"),
    raceId: v.id("races"), // Score is for a specific race within the room
    userId: v.id("users"),
    points: v.number(), // Points earned for this race
    breakdown: v.object({
      positionPoints: v.number(),
      fastestLapPoints: v.number(),
      polePositionPoints: v.number(),
      dnfPenalty: v.number(),
      total: v.number(),
    }),
    calculatedAt: v.number(),
  })
    .index("by_room", ["roomId"])
    .index("by_race", ["raceId"])
    .index("by_user", ["userId"])
    .index("by_room_user", ["roomId", "userId"])
    .index("by_room_race_user", ["roomId", "raceId", "userId"])
    .index("by_room_points", ["roomId", "points"]),
});
