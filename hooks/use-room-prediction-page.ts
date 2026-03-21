"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * Data for the room race prediction page only — avoids subscribing to
 * leaderboard, full race list, and cross-room user predictions (lighter than useRoom).
 */
export function useRoomPredictionPage(
  roomId: Id<"rooms">,
  raceId: Id<"races">
) {
  const room = useQuery(api.queries.rooms.getRoom, { roomId });
  const participants = useQuery(api.queries.rooms.getRoomParticipants, {
    roomId,
  });
  const currentUser = useQuery(api.queries.auth.getCurrentUser);

  const season = useQuery(
    api.queries.seasons.getSeasonById,
    room ? { seasonId: room.seasonId } : "skip"
  );

  const selectedRace = useQuery(
    api.queries.races.getRaceById,
    raceId ? { raceId } : "skip"
  );

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

  const isLoading =
    room === undefined ||
    participants === undefined ||
    currentUser === undefined ||
    (room && season === undefined) ||
    selectedRace === undefined;

  return {
    room,
    season,
    selectedRace,
    currentUser,
    userPrediction,
    participants,
    isLoading,
  };
}
