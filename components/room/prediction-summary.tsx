"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTeamColor } from "@/lib/f1-images";
import type { Doc } from "@/convex/_generated/dataModel";

const SMALL_ROOM_THRESHOLD = 6;

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
    <div className="rounded-sm bg-paddock-surface-low">
      {/* Header — clickable for past races */}
      <button
        type="button"
        className="flex w-full items-start justify-between gap-2 px-5 py-4 text-left"
        onClick={() => isPast && setIsExpanded(!isExpanded)}
        disabled={!isPast}
      >
        <div className="flex min-w-0 flex-1 gap-4">
          {/* Leading Edge accent */}
          <div className="mt-0.5 h-12 w-1 shrink-0 rounded-full bg-paddock-on-muted/20" />
          <div className="min-w-0">
            <h4 className="font-display text-sm font-bold uppercase tracking-wide text-paddock-on">
              {race.name}
            </h4>
            <p className="mt-0.5 font-display text-[10px] uppercase tracking-widest text-paddock-on-muted/60">
              {race.circuit}
            </p>
            {predictionCount > 0 ? (
              <p className="mt-1.5 font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted">
                {predictionCount} of {participantCount} participants voted
              </p>
            ) : (
              <p className="mt-1.5 font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted">
                No predictions yet
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 pt-0.5">
          {isPast && (
            <span className="font-display text-[9px] font-semibold uppercase tracking-widest text-paddock-on-muted/50">
              Locked
            </span>
          )}
          {isPast && (
            <span className="text-paddock-on-muted/40 transition-colors hover:text-paddock-on-muted">
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
        <div className="px-5 pb-5 pt-2">
          {/* View mode toggle — inset/carved look */}
          <div className="mb-5 flex rounded-sm bg-paddock-surface-lowest p-1">
            <button
              type="button"
              onClick={() => setViewMode("aggregate")}
              className={cn(
                "flex-1 rounded-sm py-1.5 font-display text-[10px] font-semibold uppercase tracking-widest transition-colors",
                viewMode === "aggregate"
                  ? "bg-paddock-surface-high text-paddock-on"
                  : "text-paddock-on-muted/60 hover:text-paddock-on-muted"
              )}
            >
              Aggregate
            </button>
            <button
              type="button"
              onClick={() => setViewMode("by-user")}
              className={cn(
                "flex-1 rounded-sm py-1.5 font-display text-[10px] font-semibold uppercase tracking-widest transition-colors",
                viewMode === "by-user"
                  ? "bg-paddock-surface-high text-paddock-on"
                  : "text-paddock-on-muted/60 hover:text-paddock-on-muted"
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

function AggregateVoteBlocks({
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
  const trackClass = compact
    ? "h-1 max-w-[7rem] overflow-hidden rounded-full bg-paddock-surface-high"
    : "h-1 w-full max-w-xl overflow-hidden rounded-full bg-paddock-surface-high";

  return (
    <>
      <div className="mb-5">
        <h5 className="mb-2 font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted">
          Top 10 Predictions
        </h5>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((position) => {
            const votes = positionVotes[position];
            if (!votes || votes.size === 0) return null;

            const sortedAll = Array.from(votes.entries()).sort(
              (a, b) => b[1] - a[1]
            );
            const sortedVotes = sortedAll.slice(0, TOP_K);
            const hiddenOthers = sortedAll.length - sortedVotes.length;

            return (
              <div key={position} className="flex items-start gap-2">
                <span className="w-8 shrink-0 pt-0.5 font-display text-xs font-bold tabular-nums text-paddock-on-muted">
                  P{position}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  {sortedVotes.map(([driverNumber, voteCount]) => {
                    const driver = driverMap.get(driverNumber);
                    const teamColor = driver
                      ? getTeamColor(driver.teamName)
                      : "6B7280";
                    const shareOfRoom =
                      predictionCount > 0
                        ? (voteCount / predictionCount) * 100
                        : 0;

                    return (
                      <div
                        key={driverNumber}
                        className="flex flex-wrap items-center gap-x-2 gap-y-0.5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-paddock-on">
                              {getDriverName(driverNumber)}
                            </span>
                            <span className="shrink-0 font-mono text-[10px] tabular-nums text-paddock-on-muted">
                              {voteCount}/{predictionCount} (
                              {((voteCount / predictionCount) * 100).toFixed(0)}
                              %)
                            </span>
                          </div>
                          <div className={trackClass}>
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${shareOfRoom}%`,
                                backgroundColor: `#${teamColor}`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {hiddenOthers > 0 && (
                    <div className="text-[10px] text-paddock-on-muted">
                      +{hiddenOthers} more driver
                      {hiddenOthers !== 1 ? "s" : ""} with votes
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {poleVotes.size > 0 && (
        <div className="mb-5">
          <h5 className="mb-2 font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted">
            Pole Position
          </h5>
          <div className="space-y-1">
            {renderExtraVoteRows(
              poleVotes,
              driverMap,
              getDriverName,
              predictionCount,
              trackClass
            )}
          </div>
        </div>
      )}

      {fastestLapVotes.size > 0 && (
        <div>
          <h5 className="mb-2 font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted">
            Fastest Lap
          </h5>
          <div className="space-y-1">
            {renderExtraVoteRows(
              fastestLapVotes,
              driverMap,
              getDriverName,
              predictionCount,
              trackClass
            )}
          </div>
        </div>
      )}
    </>
  );
}

function renderExtraVoteRows(
  votes: Map<number, number>,
  driverMap: Map<number, Driver>,
  getDriverName: (driverNumber: number) => string,
  predictionCount: number,
  trackClass: string
) {
  const sortedAll = Array.from(votes.entries()).sort((a, b) => b[1] - a[1]);
  const sortedVotes = sortedAll.slice(0, TOP_K);
  const hiddenOthers = sortedAll.length - sortedVotes.length;

  return (
    <>
      {sortedVotes.map(([driverNumber, voteCount]) => {
        const driver = driverMap.get(driverNumber);
        const teamColor = driver ? getTeamColor(driver.teamName) : "6B7280";
        const shareOfRoom =
          predictionCount > 0 ? (voteCount / predictionCount) * 100 : 0;

        return (
          <div key={driverNumber} className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-paddock-on">
                  {getDriverName(driverNumber)}
                </span>
                <span className="shrink-0 font-mono text-[10px] tabular-nums text-paddock-on-muted">
                  {voteCount}/{predictionCount} (
                  {((voteCount / predictionCount) * 100).toFixed(0)}%)
                </span>
              </div>
              <div className={trackClass}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${shareOfRoom}%`,
                    backgroundColor: `#${teamColor}`,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
      {hiddenOthers > 0 && (
        <div className="text-[10px] text-paddock-on-muted">
          +{hiddenOthers} more driver{hiddenOthers !== 1 ? "s" : ""} with votes
        </div>
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
          className="w-full rounded-sm bg-paddock-surface-lowest px-3 py-2 text-xs text-paddock-on placeholder:text-paddock-on-muted/50 focus:outline-none focus:ring-1 focus:ring-paddock-cyan/30"
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
            <div key={prediction._id} className="rounded-sm bg-paddock-surface">
              {useCollapsible ? (
                <button
                  type="button"
                  onClick={() => toggleUser(prediction._id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="font-display text-sm font-bold text-paddock-on">
                    {username}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="h-3.5 w-3.5 text-paddock-on-muted/50" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-paddock-on-muted/50" />
                  )}
                </button>
              ) : (
                <div className="px-4 pt-4">
                  <span className="font-display text-sm font-bold text-paddock-on">
                    {username}
                  </span>
                </div>
              )}

              {isOpen && (
                <div className="px-4 pb-4 pt-3">
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

function UserPickCard({
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
      {/* Top 10 grid */}
      <h6 className="mb-2 font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted">
        Top 10
      </h6>
      <div className="mb-4 grid grid-cols-5 gap-1.5 sm:grid-cols-10">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((position) => {
          const pred = sortedPositions.find((p) => p.position === position);
          if (!pred) {
            return (
              <div
                key={position}
                className="flex h-10 items-center justify-center rounded-sm bg-paddock-surface-high font-display text-xs font-bold tabular-nums text-paddock-on-muted"
              >
                {position}
              </div>
            );
          }

          const driver = driverMap.get(pred.driverNumber);
          const teamColor = driver ? getTeamColor(driver.teamName) : "6B7280";
          const lastName =
            getDriverName(pred.driverNumber).split(" ").pop() || "";

          return (
            <div
              key={position}
              className="relative flex h-10 flex-col items-center justify-center overflow-hidden rounded-sm"
              style={{
                backgroundColor: `#${teamColor}20`,
              }}
              title={`P${position}: ${getDriverName(pred.driverNumber)}`}
            >
              <div
                className="absolute inset-x-0 top-0 h-[2px]"
                style={{ backgroundColor: `#${teamColor}` }}
              />
              <span className="font-display text-[10px] font-bold tabular-nums text-paddock-on">
                {position}
              </span>
              <span className="truncate text-[8px] text-paddock-on-muted">
                {lastName.slice(0, 6)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Pole & Fastest Lap */}
      <div className="grid grid-cols-2 gap-3">
        {prediction.polePositionDriverId && (
          <div>
            <h6 className="mb-1 font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted">
              Pole
            </h6>
            <div className="rounded-sm bg-paddock-surface-lowest px-3 py-2 text-xs font-medium text-paddock-on">
              {getDriverName(prediction.polePositionDriverId)}
            </div>
          </div>
        )}
        {prediction.fastestLapDriverId && (
          <div>
            <h6 className="mb-1 font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted">
              Fastest Lap
            </h6>
            <div className="rounded-sm bg-paddock-surface-lowest px-3 py-2 text-xs font-medium text-paddock-on">
              {getDriverName(prediction.fastestLapDriverId)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
