"use node";

import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

/**
 * Sync race results and apply scoring for all rooms
 * This is called automatically by scheduled functions or manually by hosts
 */
export const syncRaceResultsAndScore = action({
  args: {
    raceId: v.id("races"),
  },
  handler: async (ctx, args) => {
    // Get the race first to check if results already exist
    let race = await ctx.runQuery(api.queries.races.getRaceById, {
      raceId: args.raceId,
    });

    if (!race) {
      return {
        success: false,
        message: "Race not found",
        raceId: args.raceId,
      };
    }

    // If results don't exist, sync them from OpenF1 API
    if (!race.officialResults) {
      try {
        const syncResult = await ctx.runAction(
          api.actions.openf1.updateRaceResultsFromOpenF1,
          {
            raceId: args.raceId,
          },
        );

        if (!syncResult.resultsUpdated) {
          return {
            success: false,
            message: "Failed to sync race results",
            raceId: args.raceId,
          };
        }

        // Re-fetch race to get updated results
        race = await ctx.runQuery(api.queries.races.getRaceById, {
          raceId: args.raceId,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return {
          success: false,
          message: `Failed to sync results: ${errorMessage}`,
          raceId: args.raceId,
        };
      }
    }

    if (!race || !race.officialResults) {
      return {
        success: false,
        message: "Race results not available",
        raceId: args.raceId,
      };
    }

    // Find all rooms that have this race in their season
    const season = await ctx.runQuery(api.queries.seasons.getSeasonById, {
      seasonId: race.seasonId,
    });

    if (!season) {
      return {
        success: false,
        message: "Season not found",
        raceId: args.raceId,
      };
    }

    // Get all rooms for this season
    const rooms = await ctx.runQuery(api.queries.rooms.getRoomsBySeason, {
      seasonId: race.seasonId,
    });

    const results = {
      raceId: args.raceId,
      roomsProcessed: 0,
      roomsScored: 0,
      errors: [] as string[],
    };

    // Apply scoring for each room
    for (const room of rooms) {
      try {
        // Check if scores already exist (to avoid duplicate scoring)
        const existingScores = await ctx.runQuery(
          api.queries.leaderboard.getRoomRaceLeaderboard,
          {
            roomId: room._id,
            raceId: args.raceId,
          },
        );

        // If scores already exist for all participants, skip
        const predictions = await ctx.runQuery(
          api.queries.predictions.getRoomRacePredictions,
          {
            roomId: room._id,
            raceId: args.raceId,
          },
        );

        if (
          existingScores &&
          existingScores.length > 0 &&
          existingScores.length >= predictions.length
        ) {
          results.roomsProcessed++;
          continue;
        }

        // Apply scoring using internal mutation
        await ctx.runMutation(
          internal.mutations.raceScoring.applyScoringForRoom,
          {
            roomId: room._id,
            raceId: args.raceId,
          },
        );

        results.roomsScored++;
        results.roomsProcessed++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        results.errors.push(`Room ${room._id}: ${errorMessage}`);
        results.roomsProcessed++;
      }
    }

    return {
      success: true,
      message: `Synced results and scored ${results.roomsScored} rooms`,
      ...results,
    };
  },
});

/**
 * Internal action called by scheduled function
 * Checks for completed races without results and syncs them
 */
export const syncCompletedRaces = internalAction({
  args: {},
  handler: async (ctx) => {
    // Get all completed races without results
    const completedRaces = await ctx.runQuery(
      api.queries.races.getCompletedRacesWithoutResults,
      {},
    );

    if (completedRaces.length === 0) {
      return {
        success: true,
        message: "No completed races to sync",
        racesProcessed: 0,
      };
    }

    const results = {
      racesProcessed: 0,
      racesSynced: 0,
      errors: [] as string[],
    };

    // Process each race (with a small delay between races to avoid rate limiting)
    for (const race of completedRaces) {
      try {
        // Only sync races that completed at least 1 hour ago (give API time to update)
        const raceEndTime = race.date + 2 * 60 * 60 * 1000; // Assume race ends 2 hours after start
        const now = Date.now();
        if (now < raceEndTime + 60 * 60 * 1000) {
          // Race finished less than 1 hour ago, skip for now
          continue;
        }

        const syncResult = await ctx.runAction(
          api.actions.raceSync.syncRaceResultsAndScore,
          {
            raceId: race._id,
          },
        );

        if (syncResult.success) {
          results.racesSynced++;
        } else {
          results.errors.push(
            `Race ${race.name} (${race._id}): ${syncResult.message}`,
          );
        }

        results.racesProcessed++;

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        results.errors.push(`Race ${race._id}: ${errorMessage}`);
        results.racesProcessed++;
      }
    }

    return {
      success: true,
      message: `Processed ${results.racesProcessed} races, synced ${results.racesSynced}`,
      ...results,
    };
  },
});
