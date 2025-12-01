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

export default crons;
