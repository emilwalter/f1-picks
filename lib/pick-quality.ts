import type { Doc } from "@/convex/_generated/dataModel";

type PredictionSlice = Pick<
  Doc<"predictions">,
  "predictedPositions" | "fastestLapDriverId" | "polePositionDriverId"
>;

type OfficialSlice = NonNullable<Doc<"races">["officialResults"]>;

function actualTop10DriverSet(official: OfficialSlice): Set<number> {
  const set = new Set<number>();
  for (const row of official.positions) {
    if (row.position >= 1 && row.position <= 10) {
      set.add(row.driverNumber);
    }
  }
  return set;
}

/**
 * For each P1–P10 slot: counts 1 if the driver you picked finished **somewhere**
 * in the top 10 (order does not matter). Matches how scoring rewards “right
 * driver, wrong slot” with partial credit — this is the qualitative “field” read.
 */
export function computeTop10FieldOverlap(
  prediction: PredictionSlice | null | undefined,
  official: OfficialSlice
): number {
  if (!prediction?.predictedPositions?.length) return 0;
  const actualTop10 = actualTop10DriverSet(official);
  let overlap = 0;
  for (let pos = 1; pos <= 10; pos++) {
    const pred = prediction.predictedPositions.find((x) => x.position === pos);
    if (!pred || pred.driverNumber === 0) continue;
    if (actualTop10.has(pred.driverNumber)) overlap++;
  }
  return overlap;
}

export function pickQualityLabel(hitsOutOf10: number): string {
  if (hitsOutOf10 >= 10) return "PERFECT";
  if (hitsOutOf10 >= 8) return "LEGENDARY";
  if (hitsOutOf10 >= 6) return "EXCELLENT";
  if (hitsOutOf10 >= 4) return "SOLID";
  if (hitsOutOf10 >= 2) return "MIXED";
  return "TOUGH BREAK";
}

export function poleFastestHits(
  prediction: PredictionSlice | null | undefined,
  official: OfficialSlice
): { pole: boolean | null; fastestLap: boolean | null } {
  if (!prediction) return { pole: null, fastestLap: null };
  const pole =
    prediction.polePositionDriverId != null &&
    official.polePositionDriverId != null
      ? prediction.polePositionDriverId === official.polePositionDriverId
      : null;
  const fastestLap =
    prediction.fastestLapDriverId != null && official.fastestLapDriverId != null
      ? prediction.fastestLapDriverId === official.fastestLapDriverId
      : null;
  return { pole, fastestLap };
}
