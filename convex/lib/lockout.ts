/**
 * Helper functions for calculating prediction lockout times
 */

import type { Doc } from "../_generated/dataModel";

/**
 * Calculate the actual lockout timestamp based on room's lockout config and race session times
 * Returns null if session times are not available and config requires them
 */
export function calculateLockoutTime(
  room: Doc<"rooms">,
  race: Doc<"races"> | null,
): number | null {
  if (!race) {
    return null;
  }

  const config = room.lockoutConfig;

  // Custom timestamp - use directly
  if (config.type === "custom") {
    return config.timestamp;
  }

  // Session-based lockout - need session times
  if (!race.sessionTimes) {
    return null; // Can't calculate without session times
  }

  const sessionTimes = race.sessionTimes;

  if (config.type === "before_session") {
    const session = sessionTimes[config.session];
    if (!session) {
      return null; // Session time not available
    }
    return session.start;
  }

  if (config.type === "before_session_end") {
    const session = sessionTimes[config.session];
    if (!session) {
      return null; // Session time not available
    }
    return session.end;
  }

  return null;
}

/**
 * Check if predictions are currently locked for a room
 */
export function isLocked(
  room: Doc<"rooms">,
  race: Doc<"races"> | null,
): boolean {
  // If room is manually locked or scored, it's locked
  if (
    room.status === "locked" ||
    room.status === "scored" ||
    room.status === "archived"
  ) {
    return true;
  }

  // Calculate lockout time
  const lockoutTime = calculateLockoutTime(room, race);
  if (lockoutTime === null) {
    // If we can't calculate lockout time, allow predictions (graceful degradation)
    return false;
  }

  // Check if lockout time has passed
  return Date.now() >= lockoutTime;
}

/**
 * Get time until lockout (in milliseconds)
 * Returns null if lockout time cannot be calculated or has already passed
 */
export function getTimeUntilLockout(
  room: Doc<"rooms">,
  race: Doc<"races"> | null,
): number | null {
  const lockoutTime = calculateLockoutTime(room, race);
  if (lockoutTime === null) {
    return null;
  }

  const now = Date.now();
  if (now >= lockoutTime) {
    return null; // Already locked
  }

  return lockoutTime - now;
}
