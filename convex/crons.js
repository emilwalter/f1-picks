import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

/**
 * Scheduled function to automatically sync race results and apply scoring
 * Runs every hour to check for completed races
 */
const crons = cronJobs();

// Run every hour to check for completed races
crons.interval(
  "syncCompletedRaces",
  {
    minutes: 60, // Run every 60 minutes (hourly)
  },
  internal.actions.raceSync.syncCompletedRaces
);

// Keep the current season in step with f1api.dev: races it adds, moves or
// drops mid-season, and session times it publishes late. Every 6 hours is
// enough to pick up a new race well before its weekend.
crons.interval(
  "syncSeasonSchedule",
  { hours: 6 },
  internal.actions.f1Connect.syncCurrentSeasonSchedule
);

export default crons;
