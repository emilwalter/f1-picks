"use client";

import { memo, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTeamColor } from "@/lib/f1-images";
import type { Doc } from "@/convex/_generated/dataModel";
const SMALL_ROOM_THRESHOLD = 6;

/** Telemetry-style fill: team color, slightly transparent at the leading edge (DESIGN.md). */
function teamTelemetryGradient(teamHex: string): string {
  const c = `#${teamHex}`;
  return `linear-gradient(90deg, color-mix(in srgb, ${c} 45%, transparent), ${c})`;
}

interface Driver {
  driverNumber: number;
  name: string;
  teamName: string;
}

interface PredictionWithUser {
  _id: string;
  predictedPositions: Array<{ position: number; driverNumber: number }>;
  fastestLapDriverId?: number;
  polePositionDriverId?: number;
  user: Doc<"users"> | null;
}

export interface PredictionSummaryProps {
  race: Doc<"races">;
  predictions: PredictionWithUser[];
  drivers: Driver[];
  participantCount: number;
  isPast: boolean;
  defaultExpanded?: boolean;
  defaultViewMode?: "aggregate" | "by-user";
}

function defaultViewForParticipants(n: number): "aggregate" | "by-user" {
  return n <= SMALL_ROOM_THRESHOLD ? "by-user" : "aggregate";
}

export function PredictionSummary({
  race,
  predictions,
  drivers,
  participantCount,
  isPast,
  defaultExpanded,
  defaultViewMode,
}: PredictionSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(
    defaultExpanded !== undefined ? defaultExpanded : !isPast
  );
  const [viewMode, setViewMode] = useState<"aggregate" | "by-user">(() =>
    defaultViewMode !== undefined
      ? defaultViewMode
      : defaultViewForParticipants(participantCount)
  );
  const predictionCount = predictions.length;
  const isSmallRoom = participantCount <= SMALL_ROOM_THRESHOLD;

  const driverMap = useMemo(() => {
    const m = new Map<number, Driver>();
    drivers.forEach((driver) => m.set(driver.driverNumber, driver));
    return m;
  }, [drivers]);

  const positionVotes: Record<number, Map<number, number>> = {};
  for (let pos = 1; pos <= 10; pos++) {
    positionVotes[pos] = new Map<number, number>();
  }
  predictions.forEach((prediction) => {
    prediction.predictedPositions.forEach((pred) => {
      const currentCount =
        positionVotes[pred.position]?.get(pred.driverNumber) || 0;
      positionVotes[pred.position]?.set(pred.driverNumber, currentCount + 1);
    });
  });

  const poleVotes = new Map<number, number>();
  predictions.forEach((prediction) => {
    if (prediction.polePositionDriverId) {
      const c = poleVotes.get(prediction.polePositionDriverId) || 0;
      poleVotes.set(prediction.polePositionDriverId, c + 1);
    }
  });

  const fastestLapVotes = new Map<number, number>();
  predictions.forEach((prediction) => {
    if (prediction.fastestLapDriverId) {
      const c = fastestLapVotes.get(prediction.fastestLapDriverId) || 0;
      fastestLapVotes.set(prediction.fastestLapDriverId, c + 1);
    }
  });

  const getDriverName = (driverNumber: number): string =>
    driverMap.get(driverNumber)?.name || `#${driverNumber}`;

  return (
    <div className="overflow-hidden rounded-sm bg-paddock-surface-low">
      {/* Header — clickable for past races; leading edge = locked / past (DESIGN.md) */}
      <button
        type="button"
        className={cn(
          "flex min-h-[3.25rem] w-full touch-manipulation items-start justify-between gap-2 px-4 py-4 text-left transition-colors sm:min-h-0",
          isPast && "hover:bg-paddock-surface/40"
        )}
        onClick={() => isPast && setIsExpanded(!isExpanded)}
        disabled={!isPast}
      >
        <div className="flex min-w-0 flex-1 gap-3">
          <div
            className={cn(
              "mt-0.5 h-14 w-1 shrink-0 rounded-sm",
              isPast ? "bg-paddock-warning/90" : "bg-paddock-cyan/40"
            )}
            aria-hidden
          />
          <div className="min-w-0">
            <h4 className="font-display text-sm font-bold uppercase tracking-tight text-paddock-on">
              {race.name}
            </h4>
            <p className="mt-0.5 font-display text-[10px] uppercase tracking-[0.2em] text-paddock-on-muted">
              {race.circuit}
            </p>
            {predictionCount > 0 ? (
              <p className="mt-1.5 font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-paddock-on-muted">
                {predictionCount} of {participantCount} participants voted
              </p>
            ) : (
              <p className="mt-1.5 font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-paddock-on-muted">
                No predictions yet
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-0.5 sm:gap-3">
          {isPast && (
            <span className="rounded-sm bg-paddock-surface-highest px-2 py-0.5 font-display text-[9px] font-semibold uppercase tracking-widest text-paddock-warning">
              Locked
            </span>
          )}
          {isPast && (
            <span className="text-paddock-on-muted/50">
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </span>
          )}
        </div>
      </button>

      {isExpanded && predictionCount > 0 && (
        <div className="rounded-b-sm bg-paddock-surface-lowest/50 px-4 pb-5 pt-4 carbon-texture">
          {/* View mode toggle — chassis inset; active = technical cyan trace (DESIGN.md) */}
          <div className="mb-5 flex rounded-sm bg-paddock-surface-lowest p-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
            <button
              type="button"
              onClick={() => setViewMode("aggregate")}
              className={cn(
                "min-h-11 flex-1 touch-manipulation rounded-sm py-2.5 font-display text-[10px] font-semibold uppercase tracking-[0.2em] transition-all sm:min-h-0 sm:py-2",
                viewMode === "aggregate"
                  ? "bg-paddock-surface-high text-paddock-on shadow-[inset_0_0_0_1px_rgba(0,218,243,0.25)]"
                  : "text-paddock-on-muted/70 hover:text-paddock-on-muted"
              )}
            >
              Aggregate
            </button>
            <button
              type="button"
              onClick={() => setViewMode("by-user")}
              className={cn(
                "min-h-11 flex-1 touch-manipulation rounded-sm py-2.5 font-display text-[10px] font-semibold uppercase tracking-[0.2em] transition-all sm:min-h-0 sm:py-2",
                viewMode === "by-user"
                  ? "bg-paddock-surface-high text-paddock-on shadow-[inset_0_0_0_1px_rgba(0,218,243,0.25)]"
                  : "text-paddock-on-muted/70 hover:text-paddock-on-muted"
              )}
            >
              By User
            </button>
          </div>

          {viewMode === "aggregate" ? (
            <AggregateVoteBlocks
              positionVotes={positionVotes}
              poleVotes={poleVotes}
              fastestLapVotes={fastestLapVotes}
              driverMap={driverMap}
              getDriverName={getDriverName}
              predictionCount={predictionCount}
              compact={isSmallRoom}
            />
          ) : (
            <ByUserView
              predictions={predictions}
              driverMap={driverMap}
              getDriverName={getDriverName}
              participantCount={participantCount}
            />
          )}
        </div>
      )}
    </div>
  );
}

const TOP_K = 3;

function TelemetryVoteRow({
  driverNumber,
  voteCount,
  predictionCount,
  driverMap,
  getDriverName,
  compact,
}: {
  driverNumber: number;
  voteCount: number;
  predictionCount: number;
  driverMap: Map<number, Driver>;
  getDriverName: (driverNumber: number) => string;
  compact: boolean;
}) {
  const driver = driverMap.get(driverNumber);
  const teamColor = driver ? getTeamColor(driver.teamName) : "6B7280";
  const shareOfRoom =
    predictionCount > 0 ? (voteCount / predictionCount) * 100 : 0;
  const pct = predictionCount > 0 ? (voteCount / predictionCount) * 100 : 0;

  return (
    <div className="flex min-w-0 gap-0 overflow-hidden rounded-sm bg-paddock-surface shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
      <div
        className="w-1 shrink-0 self-stretch rounded-l-sm"
        style={{ backgroundColor: `#${teamColor}` }}
        aria-hidden
      />
      <div className="min-w-0 flex-1 space-y-1 px-2 py-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-sans text-[13px] font-medium leading-snug text-paddock-on">
            {getDriverName(driverNumber)}
          </span>
          <span className="shrink-0 font-display text-[10px] font-semibold tabular-nums tracking-tight text-paddock-on-muted">
            {voteCount}/{predictionCount}{" "}
            <span className="text-paddock-on-muted/80">
              ({pct.toFixed(0)}%)
            </span>
          </span>
        </div>
        <div
          className={cn(
            "h-1 overflow-hidden rounded-sm bg-paddock-surface-lowest",
            compact ? "max-w-[min(100%,7rem)]" : "max-w-xl"
          )}
        >
          <div
            className="h-full rounded-sm transition-[width] duration-300 ease-out"
            style={{
              width: `${shareOfRoom}%`,
              background: teamTelemetryGradient(teamColor),
            }}
          />
        </div>
      </div>
    </div>
  );
}

const AggregateVoteBlocks = memo(function AggregateVoteBlocks({
  positionVotes,
  poleVotes,
  fastestLapVotes,
  driverMap,
  getDriverName,
  predictionCount,
  compact,
}: {
  positionVotes: Record<number, Map<number, number>>;
  poleVotes: Map<number, number>;
  fastestLapVotes: Map<number, number>;
  driverMap: Map<number, Driver>;
  getDriverName: (driverNumber: number) => string;
  predictionCount: number;
  compact: boolean;
}) {
  return (
    <>
      <div className="mb-5">
        <h5 className="mb-2.5 font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-paddock-on-muted">
          Top 10 Predictions
        </h5>
        <div className="space-y-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((position) => {
            const votes = positionVotes[position];
            if (!votes || votes.size === 0) return null;

            const sortedAll = Array.from(votes.entries()).sort(
              (a, b) => b[1] - a[1]
            );
            const sortedVotes = sortedAll.slice(0, TOP_K);
            const hiddenOthers = sortedAll.length - sortedVotes.length;

            return (
              <div
                key={position}
                className="flex items-stretch gap-2.5 rounded-sm bg-paddock-surface-low/60 p-1.5 pl-2"
              >
                <span className="w-9 shrink-0 self-center pt-0.5 text-center font-display text-[11px] font-bold tabular-nums text-paddock-cyan-soft/90">
                  P{position}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  {sortedVotes.map(([driverNumber, voteCount]) => (
                    <TelemetryVoteRow
                      key={driverNumber}
                      driverNumber={driverNumber}
                      voteCount={voteCount}
                      predictionCount={predictionCount}
                      driverMap={driverMap}
                      getDriverName={getDriverName}
                      compact={compact}
                    />
                  ))}
                  {hiddenOthers > 0 && (
                    <p className="px-1 font-display text-[10px] uppercase tracking-wider text-paddock-on-muted/90">
                      +{hiddenOthers} more driver
                      {hiddenOthers !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {poleVotes.size > 0 && (
        <div className="mb-5">
          <h5 className="mb-2.5 font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-paddock-on-muted">
            Pole Position
          </h5>
          <div className="space-y-1">
            {renderExtraVoteRows(
              poleVotes,
              driverMap,
              getDriverName,
              predictionCount,
              compact
            )}
          </div>
        </div>
      )}

      {fastestLapVotes.size > 0 && (
        <div>
          <h5 className="mb-2.5 font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-paddock-on-muted">
            Fastest Lap
          </h5>
          <div className="space-y-1">
            {renderExtraVoteRows(
              fastestLapVotes,
              driverMap,
              getDriverName,
              predictionCount,
              compact
            )}
          </div>
        </div>
      )}
    </>
  );
});

function renderExtraVoteRows(
  votes: Map<number, number>,
  driverMap: Map<number, Driver>,
  getDriverName: (driverNumber: number) => string,
  predictionCount: number,
  compact: boolean
) {
  const sortedAll = Array.from(votes.entries()).sort((a, b) => b[1] - a[1]);
  const sortedVotes = sortedAll.slice(0, TOP_K);
  const hiddenOthers = sortedAll.length - sortedVotes.length;

  return (
    <>
      {sortedVotes.map(([driverNumber, voteCount]) => (
        <TelemetryVoteRow
          key={driverNumber}
          driverNumber={driverNumber}
          voteCount={voteCount}
          predictionCount={predictionCount}
          driverMap={driverMap}
          getDriverName={getDriverName}
          compact={compact}
        />
      ))}
      {hiddenOthers > 0 && (
        <p className="font-display text-[10px] uppercase tracking-wider text-paddock-on-muted/90">
          +{hiddenOthers} more driver{hiddenOthers !== 1 ? "s" : ""}
        </p>
      )}
    </>
  );
}

const COLLAPSIBLE_BY_USER_THRESHOLD = 7;

function ByUserView({
  predictions,
  driverMap,
  getDriverName,
  participantCount,
}: {
  predictions: PredictionWithUser[];
  driverMap: Map<number, Driver>;
  getDriverName: (driverNumber: number) => string;
  participantCount: number;
}) {
  const [filter, setFilter] = useState("");
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(
    () => new Set(predictions.slice(0, 3).map((p) => p._id))
  );

  const sortedPredictions = useMemo(() => {
    const sorted = [...predictions].sort((a, b) => {
      const nameA = a.user?.username || "Unknown";
      const nameB = b.user?.username || "Unknown";
      return nameA.localeCompare(nameB);
    });
    const q = filter.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((p) =>
      (p.user?.username || "Unknown").toLowerCase().includes(q)
    );
  }, [predictions, filter]);

  const useCollapsible = participantCount > COLLAPSIBLE_BY_USER_THRESHOLD;

  const toggleUser = (id: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {useCollapsible && (
        <input
          type="text"
          placeholder="Filter by name..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full rounded-sm bg-paddock-surface-lowest px-3 py-2 font-sans text-xs text-paddock-on shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] placeholder:text-paddock-on-muted/50 focus:outline-none focus:shadow-[inset_0_0_0_1px_rgba(0,218,243,0.35)]"
        />
      )}
      {sortedPredictions.length === 0 ? (
        <p className="text-xs text-paddock-on-muted">
          No picks match your filter.
        </p>
      ) : (
        sortedPredictions.map((prediction) => {
          const username = prediction.user?.username || "Unknown";
          const isOpen = !useCollapsible || expandedUsers.has(prediction._id);

          return (
            <div
              key={prediction._id}
              className="overflow-hidden rounded-sm bg-paddock-surface shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
            >
              {useCollapsible ? (
                <button
                  type="button"
                  onClick={() => toggleUser(prediction._id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-paddock-surface-high/50"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-8 w-1 shrink-0 rounded-sm bg-paddock-accent/90"
                      aria-hidden
                    />
                    <span className="font-display text-sm font-bold tracking-tight text-paddock-on">
                      {username}
                    </span>
                  </span>
                  {isOpen ? (
                    <ChevronUp className="h-3.5 w-3.5 shrink-0 text-paddock-on-muted/50" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-paddock-on-muted/50" />
                  )}
                </button>
              ) : (
                <div className="flex items-center gap-2 px-4 pt-4">
                  <span
                    className="h-8 w-1 shrink-0 rounded-sm bg-paddock-accent/90"
                    aria-hidden
                  />
                  <span className="font-display text-sm font-bold tracking-tight text-paddock-on">
                    {username}
                  </span>
                </div>
              )}

              {isOpen && (
                <div className="px-4 pb-4 pt-1">
                  <UserPickCard
                    prediction={prediction}
                    driverMap={driverMap}
                    getDriverName={getDriverName}
                  />
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

const UserPickCard = memo(function UserPickCard({
  prediction,
  driverMap,
  getDriverName,
}: {
  prediction: PredictionWithUser;
  driverMap: Map<number, Driver>;
  getDriverName: (driverNumber: number) => string;
}) {
  const sortedPositions = [...prediction.predictedPositions].sort(
    (a, b) => a.position - b.position
  );

  return (
    <div>
      <h6 className="mb-2 font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-paddock-on-muted">
        Top 10
      </h6>
      {/* 2×5 on small screens = wider cells; 5×2 on sm+ — readable names (DESIGN.md body density) */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((position) => {
          const pred = sortedPositions.find((p) => p.position === position);
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

          const driver = driverMap.get(pred.driverNumber);
          const teamColor = driver ? getTeamColor(driver.teamName) : "6B7280";
          const fullName = getDriverName(pred.driverNumber);
          const parts = fullName.trim().split(/\s+/);
          const displayLine =
            parts.length > 1 ? parts[parts.length - 1]! : fullName;

          return (
            <div
              key={position}
              className="relative flex min-h-[3.25rem] flex-col justify-center gap-0.5 overflow-hidden rounded-sm px-1.5 py-1.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
              style={{
                backgroundColor: `color-mix(in srgb, #${teamColor} 18%, #0e0e10)`,
              }}
              title={`P${position}: ${fullName}`}
            >
              <div
                className="absolute inset-x-0 top-0 h-0.5"
                style={{ backgroundColor: `#${teamColor}` }}
                aria-hidden
              />
              <span className="text-center font-display text-[9px] font-bold tabular-nums text-paddock-on-muted">
                P{position}
              </span>
              <span className="line-clamp-2 text-center font-sans text-[10px] font-medium leading-tight text-paddock-on">
                {displayLine}
              </span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {prediction.polePositionDriverId && (
          <div>
            <h6 className="mb-1.5 font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-paddock-on-muted">
              Pole
            </h6>
            <div className="relative overflow-hidden rounded-sm bg-paddock-surface-lowest py-2 pl-3 pr-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
              <div
                className="absolute left-0 top-0 h-full w-1 rounded-l-sm"
                style={{
                  backgroundColor: `#${getTeamColor(
                    driverMap.get(prediction.polePositionDriverId)?.teamName ??
                      ""
                  )}`,
                }}
                aria-hidden
              />
              <p className="font-sans text-[13px] font-medium leading-snug text-paddock-on">
                {getDriverName(prediction.polePositionDriverId)}
              </p>
            </div>
          </div>
        )}
        {prediction.fastestLapDriverId && (
          <div>
            <h6 className="mb-1.5 font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-paddock-on-muted">
              Fastest Lap
            </h6>
            <div className="relative overflow-hidden rounded-sm bg-paddock-surface-lowest py-2 pl-3 pr-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
              <div
                className="absolute left-0 top-0 h-full w-1 rounded-l-sm"
                style={{
                  backgroundColor: `#${getTeamColor(
                    driverMap.get(prediction.fastestLapDriverId)?.teamName ?? ""
                  )}`,
                }}
                aria-hidden
              />
              <p className="font-sans text-[13px] font-medium leading-snug text-paddock-on">
                {getDriverName(prediction.fastestLapDriverId)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
