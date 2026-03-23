"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTeamColor } from "@/lib/f1-images";
import type { Doc } from "@/convex/_generated/dataModel";

interface YourPicksBreakdownProps {
  prediction: Pick<
    Doc<"predictions">,
    | "predictedPositions"
    | "fastestLapDriverId"
    | "polePositionDriverId"
    | "dnfDriverIds"
  >;
  officialResults: NonNullable<Doc<"races">["officialResults"]>;
  getDriverLastName: (driverNumber: number) => string;
  getDriverTeam: (driverNumber: number) => string;
}

/**
 * Full telemetry readout of the viewer’s submission vs official results (DESIGN.md).
 */
export function YourPicksBreakdown({
  prediction,
  officialResults,
  getDriverLastName,
  getDriverTeam,
}: YourPicksBreakdownProps) {
  const actualByPosition = new Map(
    officialResults.positions.map((p) => [p.position, p.driverNumber])
  );

  const slotHit = (pos: number, predicted?: number) => {
    if (predicted === undefined) return false;
    return actualByPosition.get(pos) === predicted;
  };

  const sorted = [...prediction.predictedPositions].sort(
    (a, b) => a.position - b.position
  );

  return (
    <section className="overflow-hidden rounded-sm bg-paddock-surface-low">
      <div className="border-b border-white/5 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="h-6 w-1 shrink-0 bg-paddock-cyan" aria-hidden />
          <h2 className="font-display text-lg font-bold uppercase tracking-widest text-paddock-on">
            Your picks
          </h2>
        </div>
        <p className="mt-1 font-display text-[10px] uppercase tracking-[0.2em] text-paddock-on-muted">
          Your submission vs the timing sheet
        </p>
        <a
          href="#room-picks-hub"
          className="mt-3 inline-block min-h-11 py-2 font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-cyan transition-colors hover:text-paddock-cyan-soft"
        >
          ↑ Room picks & pit wall (standings above)
        </a>
      </div>

      <div className="p-5">
        <h3 className="mb-3 font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-paddock-on-muted">
          Top 10 grid
        </h3>
        <div className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((position) => {
            const pred = sorted.find((p) => p.position === position);
            if (!pred) {
              return (
                <div
                  key={position}
                  className="flex min-h-[3.25rem] items-center justify-center rounded-sm bg-paddock-surface-lowest font-display text-xs font-bold tabular-nums text-paddock-on-muted/70 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
                >
                  P{position}
                </div>
              );
            }

            const hit = slotHit(position, pred.driverNumber);
            const team = getDriverTeam(pred.driverNumber);
            const teamColor = team ? getTeamColor(team) : "6B7280";
            const fullName = getDriverLastName(pred.driverNumber);
            const short = fullName.trim().split(/\s+/).pop() || fullName;

            return (
              <div
                key={position}
                className="relative flex min-h-[3.25rem] flex-col justify-center gap-0.5 overflow-hidden rounded-sm px-1.5 py-1.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                style={{
                  backgroundColor: `color-mix(in srgb, #${teamColor} 18%, #0e0e10)`,
                }}
              >
                <div
                  className="absolute inset-x-0 top-0 h-0.5"
                  style={{ backgroundColor: `#${teamColor}` }}
                  aria-hidden
                />
                <div className="flex items-start justify-between gap-1">
                  <span className="text-center font-display text-[9px] font-bold tabular-nums text-paddock-on-muted">
                    P{position}
                  </span>
                  {hit ? (
                    <Check
                      className="h-3.5 w-3.5 shrink-0 text-paddock-cyan"
                      strokeWidth={2.75}
                      aria-hidden
                    />
                  ) : (
                    <X
                      className="h-3.5 w-3.5 shrink-0 text-paddock-accent"
                      strokeWidth={2.75}
                      aria-hidden
                    />
                  )}
                </div>
                <span className="line-clamp-2 text-center font-sans text-[10px] font-medium leading-tight text-paddock-on">
                  {short}
                </span>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {prediction.polePositionDriverId != null && (
            <BonusRow
              label="Pole"
              predicted={prediction.polePositionDriverId}
              actual={officialResults.polePositionDriverId}
              getDriverLastName={getDriverLastName}
              getDriverTeam={getDriverTeam}
            />
          )}
          {prediction.fastestLapDriverId != null && (
            <BonusRow
              label="Fastest lap"
              predicted={prediction.fastestLapDriverId}
              actual={officialResults.fastestLapDriverId}
              getDriverLastName={getDriverLastName}
              getDriverTeam={getDriverTeam}
            />
          )}
        </div>

        {prediction.dnfDriverIds.length > 0 && (
          <div className="mt-6 rounded-sm bg-paddock-surface-lowest/60 p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
            <h3 className="mb-2 font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-paddock-on-muted">
              DNF predictions
            </h3>
            <ul className="flex flex-wrap gap-2">
              {prediction.dnfDriverIds.map((id) => {
                const actualDnf = new Set(officialResults.dnfDriverIds ?? []);
                const hit = actualDnf.has(id);
                return (
                  <li
                    key={id}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-sm px-2 py-1 font-display text-[10px] font-bold uppercase tracking-wide",
                      hit
                        ? "bg-paddock-cyan/15 text-paddock-cyan"
                        : "bg-paddock-accent/15 text-paddock-accent"
                    )}
                  >
                    #{id} {getDriverLastName(id)}
                    {hit ? (
                      <Check className="h-3 w-3" aria-hidden />
                    ) : (
                      <X className="h-3 w-3" aria-hidden />
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function BonusRow({
  label,
  predicted,
  actual,
  getDriverLastName,
  getDriverTeam,
}: {
  label: string;
  predicted: number;
  actual?: number;
  getDriverLastName: (n: number) => string;
  getDriverTeam: (n: number) => string;
}) {
  const hit = actual !== undefined && predicted === actual;
  const team = getDriverTeam(predicted);
  const teamColor = team ? getTeamColor(team) : "6B7280";

  return (
    <div>
      <h3 className="mb-1.5 font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-paddock-on-muted">
        {label}
      </h3>
      <div className="relative flex items-center justify-between gap-2 overflow-hidden rounded-sm bg-paddock-surface-lowest py-2 pl-3 pr-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
        <div
          className="absolute left-0 top-0 h-full w-1 rounded-l-sm"
          style={{ backgroundColor: `#${teamColor}` }}
          aria-hidden
        />
        <p className="font-sans text-[13px] font-medium leading-snug text-paddock-on">
          {getDriverLastName(predicted)}
        </p>
        {actual !== undefined ? (
          hit ? (
            <Check
              className="h-4 w-4 shrink-0 text-paddock-cyan"
              strokeWidth={2.5}
            />
          ) : (
            <X
              className="h-4 w-4 shrink-0 text-paddock-accent"
              strokeWidth={2.5}
            />
          )
        ) : null}
      </div>
    </div>
  );
}
