import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { calculateScore } from "./scoring";

/**
 * Recompute and upsert score rows for every prediction in a room for one race.
 * Used by scheduled sync and host-triggered recalculation.
 */
export async function applyScoringForRoomRace(
  ctx: MutationCtx,
  args: { roomId: Id<"rooms">; raceId: Id<"races"> }
): Promise<{
  scoresCreated: number;
  scoresUpdated: number;
  totalPredictions: number;
}> {
  const room = await ctx.db.get(args.roomId);
  if (!room) {
    throw new Error("Room not found");
  }

  const race = await ctx.db.get(args.raceId);
  if (!race) {
    throw new Error("Race not found");
  }

  if (!race.officialResults) {
    throw new Error("Race results not available");
  }

  if (race.seasonId !== room.seasonId) {
    throw new Error("Race does not belong to this room's season");
  }

  const predictions = await ctx.db
    .query("predictions")
    .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
    .collect()
    .then((preds) => preds.filter((p) => p.raceId === args.raceId));

  const now = Date.now();
  let scoresCreated = 0;
  let scoresUpdated = 0;

  const officialResults = {
    positions: race.officialResults.positions,
    fastestLapDriverId: race.officialResults.fastestLapDriverId,
    polePositionDriverId: race.officialResults.polePositionDriverId,
    dnfDriverIds: race.officialResults.dnfDriverIds ?? [],
  };

  for (const prediction of predictions) {
    const score = calculateScore(
      prediction,
      officialResults,
      room.scoringConfig
    );

    const existingScore = await ctx.db
      .query("scores")
      .withIndex("by_room_race_user", (q) =>
        q
          .eq("roomId", args.roomId)
          .eq("raceId", args.raceId)
          .eq("userId", prediction.userId)
      )
      .first();

    if (existingScore) {
      await ctx.db.patch(existingScore._id, {
        points: score.total,
        breakdown: score.breakdown,
        calculatedAt: now,
      });
      scoresUpdated++;
    } else {
      await ctx.db.insert("scores", {
        roomId: args.roomId,
        raceId: args.raceId,
        userId: prediction.userId,
        points: score.total,
        breakdown: score.breakdown,
        calculatedAt: now,
      });
      scoresCreated++;
    }
  }

  return {
    scoresCreated,
    scoresUpdated,
    totalPredictions: predictions.length,
  };
}
