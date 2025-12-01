"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * Custom hook that combines multiple Convex queries for room view
 * Returns room, season, races, participants, leaderboard, and user predictions
 */
export function useRoom(roomId: Id<"rooms">, raceId?: Id<"races">) {
  const room = useQuery(api.queries.rooms.getRoom, { roomId });
  const participants = useQuery(api.queries.rooms.getRoomParticipants, {
    roomId,
  });
  const leaderboard = useQuery(api.queries.leaderboard.getRoomLeaderboard, {
    roomId,
  });
  const currentUser = useQuery(api.queries.auth.getCurrentUser);

  // Get season details if room exists
  const season = useQuery(
    api.queries.seasons.getSeasonById,
    room ? { seasonId: room.seasonId } : "skip"
  );

  // Get all races for the season
  const races = useQuery(
    api.queries.races.getRacesBySeason,
    room ? { seasonId: room.seasonId } : "skip"
  );

  // Get specific race if raceId provided
  const selectedRace = useQuery(
    api.queries.races.getRaceById,
    raceId ? { raceId } : "skip"
  );

  // Get current user's prediction for a specific race if raceId provided
  const userPrediction = useQuery(
    api.queries.predictions.getUserPrediction,
    currentUser && room && raceId
      ? {
          roomId,
          raceId,
          userId: currentUser._id,
        }
      : "skip"
  );

  // Get all user predictions for the room (across all races)
  const userPredictions = useQuery(
    api.queries.predictions.getUserRoomPredictions,
    currentUser && room
      ? {
          roomId,
          userId: currentUser._id,
        }
      : "skip"
  );

  return {
    room,
    season,
    races,
    selectedRace: selectedRace || undefined,
    participants,
    leaderboard,
    currentUser,
    userPrediction,
    userPredictions,
    isLoading:
      room === undefined ||
      participants === undefined ||
      leaderboard === undefined ||
      currentUser === undefined ||
      races === undefined ||
      (room && season === undefined),
  };
}
