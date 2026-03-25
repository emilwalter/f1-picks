"use client";

import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Doc } from "@/convex/_generated/dataModel";
import {
  computeTop10FieldOverlap,
  pickQualityLabel,
  poleFastestHits,
} from "@/lib/pick-quality";

type PredictionSlice = Pick<
  Doc<"predictions">,
  | "predictedPositions"
  | "fastestLapDriverId"
  | "polePositionDriverId"
  | "dnfDriverIds"
>;

type ScoreBreakdownSlice = {
  fastestLapPoints?: number;
  polePositionPoints?: number;
  dnfMultiplierBonus?: number;
};

interface PickQualityPanelProps {
  prediction: PredictionSlice | null | undefined;
  officialResults: NonNullable<Doc<"races">["officialResults"]>;
  /** Current user's row from race leaderboard, if scored */
  scoreBreakdown?: ScoreBreakdownSlice | null;
  /** While user predictions are loading */
  isLoading?: boolean;
  className?: string;
}

/**
 * Precision analysis + pick quality tier (telemetry style) for the results page.
 */
export function PickQualityPanel({
  prediction,
  officialResults,
  scoreBreakdown,
  isLoading = false,
  className,
}: PickQualityPanelProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          "animate-pulse rounded-sm border border-white/5 bg-paddock-surface-low p-8",
          className
        )}
      >
        <div className="h-3 w-40 rounded bg-white/10" />
        <div className="mt-6 h-2 w-full max-w-md rounded bg-white/10" />
        <div className="mt-3 h-24 w-32 rounded bg-white/5 md:ml-auto" />
      </div>
    );
  }

  const hits = computeTop10FieldOverlap(prediction, officialResults);
  const pct = hits * 10;
  const tier = pickQualityLabel(hits);
  const { pole, fastestLap } = poleFastestHits(prediction, officialResults);

  const bonusPts = scoreBreakdown?.dnfMultiplierBonus ?? 0;
  const polePts = scoreBreakdown?.polePositionPoints ?? 0;
  const flPts = scoreBreakdown?.fastestLapPoints ?? 0;
  const strategyLine =
    polePts > 0 || flPts > 0 || bonusPts > 0
      ? polePts + flPts + bonusPts
      : null;

  if (!prediction) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-sm border border-white/5 bg-paddock-surface-low p-6 md:p-8",
          className
        )}
      >
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.25em] text-paddock-on-muted">
          Pick quality
        </p>
        <p className="mt-2 text-sm text-paddock-on-muted">
          No prediction on file for this race — nothing to score against the
          grid.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-sm border border-white/5 bg-paddock-surface-low shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]",
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.35) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative z-10 flex flex-col gap-8 p-6 md:flex-row md:items-stretch md:justify-between md:gap-10 md:p-8">
        <div className="min-w-0 flex-1 space-y-5">
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.25em] text-paddock-on-muted">
            Precision analysis
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-display text-xs font-medium uppercase tracking-wider text-paddock-on/90">
                Top 10 field
              </span>
              <span className="font-display text-lg font-black tabular-nums text-paddock-cyan">
                {hits}/10
              </span>
            </div>
            <p className="font-display text-[9px] leading-relaxed uppercase tracking-[0.12em] text-paddock-on-muted">
              Slots where your pick finished in the top 10 — position
              doesn&apos;t need to match; exact slots still drive points.
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-paddock-surface-highest">
              <div
                className="h-full rounded-full bg-paddock-cyan transition-[width] duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {(pole !== null || fastestLap !== null) && (
            <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-white/5 pt-4">
              {pole !== null && (
                <div className="flex items-center gap-2">
                  <span className="font-display text-[10px] uppercase tracking-widest text-paddock-on-muted">
                    Pole
                  </span>
                  <span
                    className={cn(
                      "rounded-sm px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-widest",
                      pole
                        ? "bg-paddock-cyan/20 text-paddock-cyan"
                        : "bg-white/5 text-paddock-on-muted"
                    )}
                  >
                    {pole ? "Hit" : "Miss"}
                  </span>
                </div>
              )}
              {fastestLap !== null && (
                <div className="flex items-center gap-2">
                  <span className="font-display text-[10px] uppercase tracking-widest text-paddock-on-muted">
                    Fastest lap
                  </span>
                  <span
                    className={cn(
                      "rounded-sm px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-widest",
                      fastestLap
                        ? "bg-paddock-cyan/20 text-paddock-cyan"
                        : "bg-white/5 text-paddock-on-muted"
                    )}
                  >
                    {fastestLap ? "Hit" : "Miss"}
                  </span>
                </div>
              )}
            </div>
          )}

          {strategyLine !== null && strategyLine > 0 && (
            <div className="border-t border-white/5 pt-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-display text-xs font-medium uppercase tracking-wider text-paddock-on/90">
                  Bonus stack
                </span>
                <span className="font-display text-lg font-black tabular-nums text-amber-400/95">
                  +{strategyLine.toFixed(0)} pts
                </span>
              </div>
              <p className="mt-1 font-display text-[9px] uppercase tracking-widest text-paddock-on-muted">
                Pole + fastest lap + DNF multiplier (this race)
              </p>
            </div>
          )}
        </div>

        <div className="hidden h-auto w-px shrink-0 bg-white/10 md:block" />

        <div className="flex flex-col items-center justify-center gap-2 text-center md:min-w-[12rem] md:px-4">
          <Activity
            className="h-10 w-10 text-paddock-cyan/90"
            strokeWidth={1.5}
            aria-hidden
          />
          <h2 className="font-display text-2xl font-black uppercase tracking-tight text-paddock-on md:text-3xl">
            {tier}
          </h2>
          <p className="font-display text-[9px] font-semibold uppercase tracking-[0.35em] text-paddock-on-muted">
            Pick quality
          </p>
        </div>
      </div>
    </div>
  );
}
