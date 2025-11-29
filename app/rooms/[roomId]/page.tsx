"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery, useAction } from "convex/react";
import { useRoom } from "@/hooks/use-room";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { RoomLeaderboard } from "@/components/room/room-leaderboard";
import { PredictionSummary } from "@/components/room/prediction-summary";
import { RoomSettingsDialog } from "@/components/room/room-settings-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format } from "date-fns";
import { Users, ChevronDown, ChevronUp, Settings } from "lucide-react";

interface Driver {
  driverNumber: number;
  name: string;
  teamName: string;
  teamLogo?: string;
  countryCode: string;
}

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId as Id<"rooms">;
  const {
    room,
    season,
    races,
    participants,
    leaderboard,
    currentUser,
    userPredictions,
    isLoading,
  } = useRoom(roomId);

  // Get all predictions grouped by race for the summary
  const predictionsByRace = useQuery(
    api.queries.predictions.getRoomPredictionsByRace,
    room ? { roomId } : "skip",
  );

  // Fetch drivers for visualization
  const getDriversForRace = useAction(api.actions.openf1.getDriversForRace);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(true);
  const [showLockedRaces, setShowLockedRaces] = useState(false);
  const [showRemainingRaces, setShowRemainingRaces] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const fetchDrivers = async () => {
      if (!room) return;
      setIsLoadingDrivers(true);
      try {
        const driversData = await getDriversForRace({});
        setDrivers(driversData);
      } catch (error) {
        console.error("Failed to fetch drivers:", error);
        setDrivers([]);
      } finally {
        setIsLoadingDrivers(false);
      }
    };
    fetchDrivers();
  }, [room, getDriversForRace]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-zinc-600 dark:text-zinc-400">
          Loading...
        </div>
      </div>
    );
  }

  if (!room || !season) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-zinc-600 dark:text-zinc-400">
          Room not found
        </div>
      </div>
    );
  }

  const isParticipant =
    currentUser && participants?.some((p) => p.userId === currentUser._id);

  const isHost = currentUser && room && currentUser._id === room.hostId;

  // Separate races into: next 3 active races, remaining future races, and locked races
  const now = Date.now();
  const allUnlockedRaces = races?.filter((race) => race.date >= now) || [];
  const sortedUnlockedRaces = [...allUnlockedRaces].sort(
    (a, b) => a.date - b.date,
  );
  const next3Races = sortedUnlockedRaces.slice(0, 3);
  const remainingFutureRaces = sortedUnlockedRaces.slice(3);
  const lockedRaces = races?.filter((race) => race.date < now) || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Room Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="mb-1 text-2xl leading-tight">
                {room.name || `${season.year} Season Room`}
              </CardTitle>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {season.year} Formula 1 World Championship
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isHost && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSettingsOpen(true)}
                  className="shrink-0"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
              )}
              <Badge
                variant={room.status === "open" ? "default" : "outline"}
                className="shrink-0"
              >
                {room.status}
              </Badge>
              <Link href={`/rooms/${roomId}/participants`}>
                <Badge
                  variant="secondary"
                  className="shrink-0 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700"
                >
                  <Users className="mr-1 h-3 w-3" />
                  {participants?.length || 0}
                </Badge>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">
                Join Code
              </div>
              <code className="block rounded bg-zinc-100 px-2 py-1.5 font-mono text-sm font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50">
                {room.joinCode}
              </code>
            </div>
            <div>
              <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">
                Total Races
              </div>
              <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {season.totalRaces}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8">
        {/* Race Selection */}
        {races && races.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Select Race</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Next 3 Active Races - Always Visible */}
                {next3Races.length > 0 && (
                  <div>
                    <div className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      Upcoming Races
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {next3Races.map((race) => {
                        const hasPrediction = userPredictions?.some(
                          (p) => p.raceId === race._id,
                        );

                        return (
                          <Link
                            key={race._id}
                            href={`/rooms/${roomId}/predictions/${race._id}`}
                            className="block"
                          >
                            <div className="h-auto w-full flex-col items-start rounded-md border border-zinc-200 bg-white p-3 text-left transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800">
                              <div className="w-full">
                                <div className="mb-1 flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate font-semibold text-sm">
                                      {race.name}
                                    </div>
                                    <div className="mt-0.5 truncate text-xs text-zinc-600 dark:text-zinc-400">
                                      {race.circuit}
                                    </div>
                                  </div>
                                  {hasPrediction && (
                                    <Badge
                                      variant="secondary"
                                      className="shrink-0 text-xs"
                                    >
                                      ✓
                                    </Badge>
                                  )}
                                </div>
                                <div className="mt-1.5 flex items-center justify-between">
                                  <span className="text-xs text-zinc-600 dark:text-zinc-400">
                                    {format(race.date, "MMM d")}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Remaining Future Races - Collapsible */}
                {remainingFutureRaces.length > 0 && (
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mb-2 w-full justify-between"
                      onClick={() => setShowRemainingRaces(!showRemainingRaces)}
                    >
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        {remainingFutureRaces.length} More Future Race
                        {remainingFutureRaces.length !== 1 ? "s" : ""}
                      </span>
                      {showRemainingRaces ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    {showRemainingRaces && (
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {remainingFutureRaces.map((race) => {
                          const hasPrediction = userPredictions?.some(
                            (p) => p.raceId === race._id,
                          );

                          return (
                            <Link
                              key={race._id}
                              href={`/rooms/${roomId}/predictions/${race._id}`}
                              className="block"
                            >
                              <div className="h-auto w-full flex-col items-start rounded-md border border-zinc-200 bg-white p-3 text-left transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800">
                                <div className="w-full">
                                  <div className="mb-1 flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate font-semibold text-sm">
                                        {race.name}
                                      </div>
                                      <div className="mt-0.5 truncate text-xs text-zinc-600 dark:text-zinc-400">
                                        {race.circuit}
                                      </div>
                                    </div>
                                    {hasPrediction && (
                                      <Badge
                                        variant="secondary"
                                        className="shrink-0 text-xs"
                                      >
                                        ✓
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="mt-1.5 flex items-center justify-between">
                                    <span className="text-xs text-zinc-600 dark:text-zinc-400">
                                      {format(race.date, "MMM d")}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Locked Races - Accordion */}
                {lockedRaces.length > 0 && (
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mb-2 w-full justify-between"
                      onClick={() => setShowLockedRaces(!showLockedRaces)}
                    >
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        {lockedRaces.length} Locked Race
                        {lockedRaces.length !== 1 ? "s" : ""}
                      </span>
                      {showLockedRaces ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    {showLockedRaces && (
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {lockedRaces.map((race) => {
                          const hasPrediction = userPredictions?.some(
                            (p) => p.raceId === race._id,
                          );

                          return (
                            <div key={race._id}>
                              <div className="h-auto w-full flex-col items-start rounded-md border border-zinc-300 bg-zinc-50 p-3 text-left opacity-60 dark:border-zinc-700 dark:bg-zinc-900">
                                <div className="w-full">
                                  <div className="mb-1 flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate font-semibold text-sm">
                                        {race.name}
                                      </div>
                                      <div className="mt-0.5 truncate text-xs text-zinc-600 dark:text-zinc-400">
                                        {race.circuit}
                                      </div>
                                    </div>
                                    {hasPrediction && (
                                      <Badge
                                        variant="secondary"
                                        className="shrink-0 text-xs"
                                      >
                                        ✓
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="mt-1.5 flex items-center justify-between">
                                    <span className="text-xs text-zinc-600 dark:text-zinc-400">
                                      {format(race.date, "MMM d")}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      Locked
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Prediction Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Prediction Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingDrivers ? (
              <div className="py-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
                Loading driver data...
              </div>
            ) : next3Races.length > 0 ||
              remainingFutureRaces.length > 0 ||
              lockedRaces.length > 0 ? (
              <div className="space-y-3">
                {/* Next 3 Active Races */}
                {next3Races.map((race) => {
                  const racePredictions = predictionsByRace?.[race._id] || [];
                  return (
                    <PredictionSummary
                      key={race._id}
                      race={race}
                      predictions={racePredictions}
                      drivers={drivers}
                      participantCount={participants?.length || 0}
                      isPast={false}
                    />
                  );
                })}

                {/* Remaining Future Races */}
                {remainingFutureRaces.length > 0 && (
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mb-2 w-full justify-between"
                      onClick={() => setShowRemainingRaces(!showRemainingRaces)}
                    >
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        {remainingFutureRaces.length} More Future Race
                        {remainingFutureRaces.length !== 1 ? "s" : ""}
                      </span>
                      {showRemainingRaces ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    {showRemainingRaces && (
                      <div className="space-y-3">
                        {remainingFutureRaces.map((race) => {
                          const racePredictions =
                            predictionsByRace?.[race._id] || [];
                          return (
                            <PredictionSummary
                              key={race._id}
                              race={race}
                              predictions={racePredictions}
                              drivers={drivers}
                              participantCount={participants?.length || 0}
                              isPast={false}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Locked Races - Collapsible */}
                {lockedRaces.length > 0 && (
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mb-2 w-full justify-between"
                      onClick={() => setShowLockedRaces(!showLockedRaces)}
                    >
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        {lockedRaces.length} Locked Race
                        {lockedRaces.length !== 1 ? "s" : ""}
                      </span>
                      {showLockedRaces ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    {showLockedRaces && (
                      <div className="space-y-3">
                        {lockedRaces.map((race) => {
                          const racePredictions =
                            predictionsByRace?.[race._id] || [];
                          return (
                            <PredictionSummary
                              key={race._id}
                              race={race}
                              predictions={racePredictions}
                              drivers={drivers}
                              participantCount={participants?.length || 0}
                              isPast={true}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                No races available. Click on a race above to make your
                predictions.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle>Leaderboard</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <RoomLeaderboard leaderboard={leaderboard || []} />
          </CardContent>
        </Card>
      </div>

      {/* Room Settings Dialog */}
      {isHost && room && (
        <RoomSettingsDialog
          room={room}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
        />
      )}
    </div>
  );
}
