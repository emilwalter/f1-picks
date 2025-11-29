"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTeamColor } from "@/lib/f1-images";
import type { Doc } from "@/convex/_generated/dataModel";

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

interface PredictionSummaryProps {
  race: Doc<"races">;
  predictions: PredictionWithUser[];
  drivers: Driver[];
  participantCount: number;
  isPast: boolean;
}

export function PredictionSummary({
  race,
  predictions,
  drivers,
  participantCount,
  isPast,
}: PredictionSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(!isPast);
  const [viewMode, setViewMode] = useState<"aggregate" | "by-user">(
    "aggregate",
  );
  const predictionCount = predictions.length;

  // Create a map of driver number to driver info
  const driverMap = new Map<number, Driver>();
  drivers.forEach((driver) => {
    driverMap.set(driver.driverNumber, driver);
  });

  // Calculate vote distribution for each position (1-10)
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

  // Calculate pole position votes
  const poleVotes = new Map<number, number>();
  predictions.forEach((prediction) => {
    if (prediction.polePositionDriverId) {
      const currentCount = poleVotes.get(prediction.polePositionDriverId) || 0;
      poleVotes.set(prediction.polePositionDriverId, currentCount + 1);
    }
  });

  // Calculate fastest lap votes
  const fastestLapVotes = new Map<number, number>();
  predictions.forEach((prediction) => {
    if (prediction.fastestLapDriverId) {
      const currentCount =
        fastestLapVotes.get(prediction.fastestLapDriverId) || 0;
      fastestLapVotes.set(prediction.fastestLapDriverId, currentCount + 1);
    }
  });

  const getDriverName = (driverNumber: number): string => {
    return driverMap.get(driverNumber)?.name || `#${driverNumber}`;
  };

  const getMaxVotes = (votes: Map<number, number>): number => {
    if (votes.size === 0) return 1;
    return Math.max(...Array.from(votes.values()));
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-2 p-3">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm text-zinc-900 dark:text-zinc-50">
            {race.name}
          </div>
          <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            {race.circuit}
          </div>
          {predictionCount > 0 ? (
            <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
              {predictionCount} of {participantCount} participants voted
            </div>
          ) : (
            <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              No predictions yet
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isPast && (
            <Badge variant="outline" className="shrink-0 text-xs">
              Locked
            </Badge>
          )}
          {isPast && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {isExpanded && predictionCount > 0 && (
        <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
          {/* View Mode Toggle */}
          <div className="mb-4">
            <Tabs
              value={viewMode}
              onValueChange={(v) => setViewMode(v as "aggregate" | "by-user")}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="aggregate" className="text-xs">
                  Aggregate
                </TabsTrigger>
                <TabsTrigger value="by-user" className="text-xs">
                  By User
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {viewMode === "aggregate" ? (
            <>
              {/* Position Predictions */}
              <div className="mb-4">
                <div className="mb-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Top 10 Predictions
                </div>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((position) => {
                    const votes = positionVotes[position];
                    if (!votes || votes.size === 0) return null;

                    const maxVotes = getMaxVotes(votes);
                    const sortedVotes = Array.from(votes.entries())
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 3); // Show top 3 drivers for each position

                    return (
                      <div key={position} className="flex items-center gap-2">
                        <div className="w-8 shrink-0 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                          P{position}
                        </div>
                        <div className="flex-1 space-y-1">
                          {sortedVotes.map(([driverNumber, voteCount]) => {
                            const driver = driverMap.get(driverNumber);
                            const teamColor = driver
                              ? getTeamColor(driver.teamName)
                              : "6B7280";
                            const percentage =
                              (voteCount / predictionCount) * 100;
                            const barWidth = (voteCount / maxVotes) * 100;

                            return (
                              <div
                                key={driverNumber}
                                className="flex items-center gap-2"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-zinc-900 dark:text-zinc-50">
                                      {getDriverName(driverNumber)}
                                    </span>
                                    <span className="text-xs text-zinc-600 dark:text-zinc-400">
                                      {voteCount} ({percentage.toFixed(0)}%)
                                    </span>
                                  </div>
                                  <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                                    <div
                                      className="h-full rounded-full transition-all"
                                      style={{
                                        width: `${barWidth}%`,
                                        backgroundColor: `#${teamColor}`,
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pole Position */}
              {poleVotes.size > 0 && (
                <div className="mb-4">
                  <div className="mb-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Pole Position
                  </div>
                  <div className="space-y-1">
                    {Array.from(poleVotes.entries())
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 3)
                      .map(([driverNumber, voteCount]) => {
                        const driver = driverMap.get(driverNumber);
                        const teamColor = driver
                          ? getTeamColor(driver.teamName)
                          : "6B7280";
                        const percentage = (voteCount / predictionCount) * 100;
                        const maxPoleVotes = getMaxVotes(poleVotes);
                        const barWidth = (voteCount / maxPoleVotes) * 100;

                        return (
                          <div
                            key={driverNumber}
                            className="flex items-center gap-2"
                          >
                            <div className="flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-zinc-900 dark:text-zinc-50">
                                  {getDriverName(driverNumber)}
                                </span>
                                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                                  {voteCount} ({percentage.toFixed(0)}%)
                                </span>
                              </div>
                              <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${barWidth}%`,
                                    backgroundColor: `#${teamColor}`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Fastest Lap */}
              {fastestLapVotes.size > 0 && (
                <div>
                  <div className="mb-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Fastest Lap
                  </div>
                  <div className="space-y-1">
                    {Array.from(fastestLapVotes.entries())
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 3)
                      .map(([driverNumber, voteCount]) => {
                        const driver = driverMap.get(driverNumber);
                        const teamColor = driver
                          ? getTeamColor(driver.teamName)
                          : "6B7280";
                        const percentage = (voteCount / predictionCount) * 100;
                        const maxFastestLapVotes = getMaxVotes(fastestLapVotes);
                        const barWidth = (voteCount / maxFastestLapVotes) * 100;

                        return (
                          <div
                            key={driverNumber}
                            className="flex items-center gap-2"
                          >
                            <div className="flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-zinc-900 dark:text-zinc-50">
                                  {getDriverName(driverNumber)}
                                </span>
                                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                                  {voteCount} ({percentage.toFixed(0)}%)
                                </span>
                              </div>
                              <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${barWidth}%`,
                                    backgroundColor: `#${teamColor}`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <ByUserView
              predictions={predictions}
              driverMap={driverMap}
              getDriverName={getDriverName}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ByUserView({
  predictions,
  driverMap,
  getDriverName,
}: {
  predictions: PredictionWithUser[];
  driverMap: Map<number, Driver>;
  getDriverName: (driverNumber: number) => string;
}) {
  // Sort predictions by username
  const sortedPredictions = [...predictions].sort((a, b) => {
    const nameA = a.user?.username || "Unknown";
    const nameB = b.user?.username || "Unknown";
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="space-y-4">
      {sortedPredictions.map((prediction) => {
        const username = prediction.user?.username || "Unknown";

        // Sort predicted positions by position number
        const sortedPositions = [...prediction.predictedPositions].sort(
          (a, b) => a.position - b.position,
        );

        return (
          <div
            key={prediction._id}
            className="rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50"
          >
            <div className="mb-3 font-medium text-sm text-zinc-900 dark:text-zinc-50">
              {username}
            </div>

            {/* Top 10 Positions */}
            <div className="mb-3">
              <div className="mb-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Top 10
              </div>
              <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((position) => {
                  const pred = sortedPositions.find(
                    (p) => p.position === position,
                  );
                  if (!pred) {
                    return (
                      <div
                        key={position}
                        className="flex h-8 items-center justify-center rounded border border-zinc-200 bg-white text-xs text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        {position}
                      </div>
                    );
                  }

                  const driver = driverMap.get(pred.driverNumber);
                  const teamColor = driver
                    ? getTeamColor(driver.teamName)
                    : "6B7280";

                  return (
                    <div
                      key={position}
                      className="flex h-8 flex-col items-center justify-center rounded border border-zinc-200 bg-white text-xs dark:border-zinc-700 dark:bg-zinc-900"
                      style={{
                        borderColor: `#${teamColor}40`,
                        backgroundColor: `#${teamColor}10`,
                      }}
                      title={`P${position}: ${getDriverName(pred.driverNumber)}`}
                    >
                      <div className="font-semibold text-zinc-900 dark:text-zinc-50">
                        {position}
                      </div>
                      <div className="truncate text-[10px] text-zinc-600 dark:text-zinc-400">
                        {getDriverName(pred.driverNumber).split(" ").pop()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pole Position and Fastest Lap */}
            <div className="grid grid-cols-2 gap-3">
              {prediction.polePositionDriverId && (
                <div>
                  <div className="mb-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Pole
                  </div>
                  <div className="rounded border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900">
                    {getDriverName(prediction.polePositionDriverId)}
                  </div>
                </div>
              )}
              {prediction.fastestLapDriverId && (
                <div>
                  <div className="mb-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Fastest Lap
                  </div>
                  <div className="rounded border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900">
                    {getDriverName(prediction.fastestLapDriverId)}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
