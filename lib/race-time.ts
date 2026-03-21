import type { Doc } from "@/convex/_generated/dataModel";

/** Race start time (UTC ms). Prefer session schedule, falls back to stored race date. */
export function getRaceStartTimestamp(race: Doc<"races">): number {
  return race.sessionTimes?.race?.start ?? race.date;
}
