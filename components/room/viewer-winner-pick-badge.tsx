"use client";

import { Check, CircleDashed, Minus, X } from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel";

export type WinnerPickVerdict = "pending" | "no_pick" | "correct" | "incorrect";

/**
 * Compare the viewer's predicted P1 to official results (race winner).
 * Used for telemetry-style status chips (DESIGN.md).
 */
export function getWinnerPickVerdict(
  race: Doc<"races">,
  viewerPick: Pick<Doc<"predictions">, "predictedPositions"> | null
): WinnerPickVerdict {
  const official = race.officialResults;
  if (!official?.positions?.length) return "pending";

  const actualP1 = official.positions.find(
    (p) => p.position === 1
  )?.driverNumber;
  if (actualP1 === undefined) return "pending";

  if (!viewerPick) return "no_pick";

  const predictedP1 = viewerPick.predictedPositions.find(
    (p) => p.position === 1
  )?.driverNumber;
  if (predictedP1 === undefined) return "no_pick";

  return predictedP1 === actualP1 ? "correct" : "incorrect";
}

export function ViewerWinnerPickBadge({
  verdict,
}: {
  verdict: WinnerPickVerdict;
}) {
  const base =
    "inline-flex h-7 shrink-0 items-center gap-1 rounded-sm px-1.5 font-display text-[9px] font-bold uppercase tracking-[0.14em] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]";

  switch (verdict) {
    case "correct":
      return (
        <span
          role="img"
          aria-label="Winner pick correct"
          className={`${base} bg-paddock-surface-high text-paddock-cyan`}
          title="Your winner pick matched the race result."
        >
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
          <span className="pr-0.5">P1</span>
        </span>
      );
    case "incorrect":
      return (
        <span
          role="img"
          aria-label="Winner pick incorrect"
          className={`${base} bg-paddock-surface-high text-paddock-accent`}
          title="Your winner pick did not match the race result."
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
          <span className="pr-0.5">P1</span>
        </span>
      );
    case "no_pick":
      return (
        <span
          role="img"
          aria-label="No winner pick submitted"
          className={`${base} bg-paddock-surface-highest/80 text-paddock-on-muted`}
          title="No P1 pick submitted for this race."
        >
          <Minus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
          <span className="pr-0.5">P1</span>
        </span>
      );
    case "pending":
      return (
        <span
          role="img"
          aria-label="Winner result pending sync"
          className={`${base} bg-paddock-surface-highest/80 text-paddock-warning`}
          title="Official results not synced yet — winner check unavailable."
        >
          <CircleDashed className="h-3.5 w-3.5" aria-hidden />
          <span className="pr-0.5">P1</span>
        </span>
      );
  }
}
