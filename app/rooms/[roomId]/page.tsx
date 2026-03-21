"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery, useAction, useMutation } from "convex/react";
import { useRoom } from "@/hooks/use-room";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { RoomLeaderboard } from "@/components/room/room-leaderboard";
import { PredictionSummary } from "@/components/room/prediction-summary";
import { RoomSettingsDialog } from "@/components/room/room-settings-dialog";
import { SyncAllRacesButton } from "@/components/room/sync-all-races-button";
import { Countdown } from "@/components/ui/countdown";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { getF1RaceStaticImagePaths } from "@/lib/f1-race-images";
import { getRaceStartTimestamp } from "@/lib/race-time";
import {
  Users,
  ChevronLeft,
  ChevronRight,
  Settings,
  LogOut,
  Trophy,
  Lock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Driver {
  driverNumber: number;
  name: string;
  teamName: string;
  teamLogo?: string;
  countryCode: string;
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as Id<"rooms">;
  const leaveRoom = useMutation(api.mutations.rooms.leaveRoom);
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

  const predictionsByRace = useQuery(
    api.queries.predictions.getRoomPredictionsByRace,
    room ? { roomId } : "skip"
  );

  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const allUnlockedRaces =
    races?.filter((race) => race.date >= oneDayAgo) || [];
  const sortedUnlockedRaces = [...allUnlockedRaces].sort(
    (a, b) => a.date - b.date
  );
  const nextRace =
    sortedUnlockedRaces.find((race) => race.date >= now) ||
    sortedUnlockedRaces[0] ||
    null;

  const lockoutInfo = useQuery(
    api.queries.lockout.getRoomLockoutInfo,
    room && nextRace ? { roomId, raceId: nextRace._id } : "skip"
  );

  const getDriversForRace = useAction(api.actions.f1Connect.getDriversForRace);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(true);
  const [showLockedRaces, setShowLockedRaces] = useState(false);
  const [showRemainingRaces, setShowRemainingRaces] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [upcomingRacesIndex, setUpcomingRacesIndex] = useState(0);

  useEffect(() => {
    const fetchDrivers = async () => {
      if (!room || !season) return;
      setIsLoadingDrivers(true);
      try {
        const driversData = await getDriversForRace({ year: season.year });
        setDrivers(driversData);
      } catch (error) {
        console.error("Failed to fetch drivers:", error);
        setDrivers([]);
      } finally {
        setIsLoadingDrivers(false);
      }
    };
    fetchDrivers();
  }, [room, season, getDriversForRace]);

  const RACES_PER_PAGE = 4;
  const totalUpcomingRaces = sortedUnlockedRaces.length;
  const maxUpcomingIndex = Math.max(0, totalUpcomingRaces - RACES_PER_PAGE);

  useEffect(() => {
    if (totalUpcomingRaces > 0 && upcomingRacesIndex > maxUpcomingIndex) {
      setUpcomingRacesIndex(Math.max(0, maxUpcomingIndex));
    }
  }, [upcomingRacesIndex, maxUpcomingIndex, totalUpcomingRaces]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center font-display text-sm uppercase tracking-widest text-paddock-on-muted">
          Loading...
        </div>
      </div>
    );
  }

  if (!room || !season) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center font-display text-sm uppercase tracking-widest text-paddock-on-muted">
          Room not found
        </div>
      </div>
    );
  }

  const isHost = currentUser && room && currentUser._id === room.hostId;

  const next4Races = sortedUnlockedRaces.slice(
    upcomingRacesIndex,
    upcomingRacesIndex + RACES_PER_PAGE
  );
  const remainingFutureRaces = sortedUnlockedRaces.slice(RACES_PER_PAGE);
  const lockedRaces = races?.filter((race) => race.date < oneDayAgo) || [];
  const mostRecentLockedRaceId =
    lockedRaces.length > 0
      ? [...lockedRaces].sort((a, b) => b.date - a.date)[0]._id
      : null;

  const roundNumber = nextRace
    ? (races?.findIndex((r) => r._id === nextRace._id) ?? 0) + 1
    : null;

  const nextGpImages =
    season && nextRace
      ? getF1RaceStaticImagePaths(season.year, nextRace.round)
      : null;

  const nextRaceStart = nextRace ? getRaceStartTimestamp(nextRace) : null;
  const showNextRaceCountdown = nextRaceStart !== null && nextRaceStart > now;

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      {/* Breadcrumb */}
      <Link
        href="/"
        className="room-overview-enter mb-6 inline-block font-display text-[11px] font-semibold uppercase tracking-widest text-paddock-on-muted transition-colors hover:text-paddock-cyan"
      >
        ← Dashboard
      </Link>

      {/* Page header — room name + stats (matches league_dashboard) */}
      <div className="room-overview-enter room-overview-enter-delay-1 mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-[2px] w-8 bg-paddock-accent" />
            <span className="font-display text-[10px] font-bold uppercase tracking-[0.3em] text-paddock-accent">
              Current Championship
            </span>
          </div>
          <h1 className="font-display text-4xl font-bold italic uppercase tracking-tight text-paddock-on md:text-5xl">
            {room.name || `${season.year} Season`}
          </h1>
        </div>

        <div className="flex w-full items-stretch gap-2 sm:w-auto sm:justify-end">
          {/* Participant count & actions — equal width for visual rhythm */}
          <Link
            href={`/rooms/${roomId}/participants`}
            className="flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-sm bg-paddock-surface-high px-2 py-2 font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on transition-colors hover:bg-paddock-surface-highest sm:w-[9.5rem] sm:flex-none"
          >
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span className="tabular-nums">{participants?.length || 0}</span>
          </Link>
          <Link
            href={`/rooms/${roomId}/results`}
            className="flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-sm bg-paddock-accent px-2 py-2 font-display text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-paddock-accent/90 sm:w-[9.5rem] sm:flex-none"
          >
            <Trophy className="h-3.5 w-3.5 shrink-0" />
            Results
          </Link>
          {isHost && (
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-sm bg-paddock-surface-high px-2 py-2 font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on transition-colors hover:bg-paddock-surface-highest sm:w-[9.5rem] sm:flex-none"
            >
              <Settings className="h-3.5 w-3.5 shrink-0" />
            </button>
          )}
          {!isHost && currentUser && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await leaveRoom({ roomId });
                  toast.success("Left room");
                  router.push("/");
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "Failed to leave room"
                  );
                }
              }}
              className="flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-sm bg-paddock-surface-high px-2 py-2 font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-accent transition-colors hover:bg-paddock-surface-highest sm:w-[9.5rem] sm:flex-none"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
            </button>
          )}
        </div>
      </div>

      {/* Main grid — content + sidebar */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Hero — Next Grand Prix (matches league_dashboard hero) */}
          {nextRace && (
            <Link
              href={`/rooms/${roomId}/predictions/${nextRace._id}`}
              className="room-overview-enter room-overview-enter-delay-2 group block origin-center transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.008] motion-reduce:transition-none motion-reduce:hover:scale-100"
            >
              <div className="relative flex min-h-[360px] flex-col justify-end overflow-hidden rounded-sm bg-paddock-surface p-8 sm:min-h-[400px]">
                {nextGpImages && (
                  <div className="absolute inset-0 z-0">
                    <Image
                      src={nextGpImages.card}
                      alt=""
                      fill
                      className="object-cover object-center"
                      sizes="(max-width: 1280px) 100vw, 1280px"
                      priority
                    />
                  </div>
                )}
                {/* Dark gradient overlays */}
                <div className="absolute inset-0 z-[1] bg-gradient-to-t from-paddock-bg via-paddock-bg/70 to-paddock-bg/20" />
                <div className="absolute inset-0 z-[1] bg-paddock-bg/35" />

                <div className="relative z-10">
                  <p className="font-display text-[10px] font-semibold uppercase tracking-[0.4em] text-paddock-cyan">
                    Next Grand Prix
                  </p>
                  <h2 className="mt-2 font-display text-4xl font-black italic uppercase tracking-tighter text-paddock-on transition-colors group-hover:text-white sm:text-5xl md:text-7xl">
                    {nextRace.name.replace(/Grand Prix/i, "GP")}
                  </h2>

                  <div className="mt-6 flex flex-wrap items-start gap-8">
                    <div>
                      <span className="block font-display text-[10px] uppercase tracking-widest text-paddock-on-muted">
                        Circuit
                      </span>
                      <p className="font-display text-sm font-bold text-paddock-on">
                        {nextRace.circuit}
                      </p>
                    </div>
                    <div>
                      <span className="block font-display text-[10px] uppercase tracking-widest text-paddock-on-muted">
                        Date
                      </span>
                      <p className="font-display text-sm font-bold text-paddock-on">
                        {format(nextRace.date, "MMM dd, yyyy")}
                      </p>
                    </div>
                    {roundNumber && (
                      <div>
                        <span className="block font-display text-[10px] uppercase tracking-widest text-paddock-on-muted">
                          Round
                        </span>
                        <p className="font-display text-sm font-bold tabular-nums text-paddock-on">
                          {String(roundNumber).padStart(2, "0")} /{" "}
                          {season.totalRaces}
                        </p>
                      </div>
                    )}
                    {showNextRaceCountdown && nextRaceStart !== null && (
                      <Countdown
                        targetTime={nextRaceStart}
                        label="Race start"
                        expiredLabel="Started"
                        timeClassName="font-display text-sm font-bold tabular-nums text-paddock-on"
                        expiredClassName="font-display text-sm font-bold text-paddock-on-muted"
                      />
                    )}
                    {lockoutInfo?.lockoutTime &&
                      lockoutInfo.lockoutTime > now && (
                        <Countdown
                          targetTime={lockoutInfo.lockoutTime}
                          label="Picks lock"
                          expiredLabel="Locked"
                          timeClassName="font-display text-sm font-bold tabular-nums text-paddock-on"
                          expiredClassName="font-display text-sm font-bold text-paddock-accent"
                        />
                      )}
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Upcoming Races carousel */}
          {sortedUnlockedRaces.length > 0 && (
            <div className="room-overview-enter room-overview-enter-delay-3">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-xl font-bold italic uppercase tracking-tighter text-paddock-on">
                  Upcoming Races
                </h3>
                {totalUpcomingRaces > RACES_PER_PAGE && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setUpcomingRacesIndex(
                          Math.max(0, upcomingRacesIndex - 1)
                        )
                      }
                      disabled={upcomingRacesIndex === 0}
                      className="rounded-sm bg-paddock-surface-high p-1.5 text-paddock-on transition-colors hover:bg-paddock-surface-highest active:scale-95 disabled:opacity-30 motion-reduce:active:scale-100"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setUpcomingRacesIndex(
                          Math.min(maxUpcomingIndex, upcomingRacesIndex + 1)
                        )
                      }
                      disabled={upcomingRacesIndex >= maxUpcomingIndex}
                      className="rounded-sm bg-paddock-surface-high p-1.5 text-paddock-on transition-colors hover:bg-paddock-surface-highest active:scale-95 disabled:opacity-30 motion-reduce:active:scale-100"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {next4Races.map((race) => {
                  const raceRound =
                    (races?.findIndex((r) => r._id === race._id) ?? 0) + 1;
                  const hasPrediction = userPredictions?.some(
                    (p) => p.raceId === race._id
                  );
                  const isLocked = race.date < now;
                  const f1Images =
                    season &&
                    getF1RaceStaticImagePaths(season.year, race.round);

                  return (
                    <Link
                      key={race._id}
                      href={`/rooms/${roomId}/predictions/${race._id}`}
                      className="group block origin-center transition-transform duration-300 ease-out hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100"
                    >
                      <div className="rounded-sm border-b-4 border-transparent bg-paddock-surface-low transition-[border-color,background-color] duration-300 ease-out group-hover:border-paddock-accent group-hover:bg-paddock-surface-high">
                        {f1Images && (
                          <div className="relative aspect-[16/7] w-full overflow-hidden rounded-t-sm bg-paddock-surface-highest">
                            <Image
                              src={f1Images.card}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 50vw, 25vw"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-paddock-surface-low to-transparent" />
                          </div>
                        )}
                        <div className="p-5">
                          <div className="mb-4 flex items-start justify-between">
                            <span className="font-display text-[24px] font-black text-paddock-on/10">
                              R{String(raceRound).padStart(2, "0")}
                            </span>
                            <span className="rounded-sm bg-paddock-surface-highest px-2 py-0.5 font-display text-[10px] uppercase tracking-widest text-paddock-on-muted">
                              {format(race.date, "MMM dd")}
                            </span>
                          </div>
                          <h4 className="mb-1 font-display text-lg font-bold uppercase tracking-tight text-paddock-on transition-colors group-hover:text-paddock-soft">
                            {race.name.replace(/Grand Prix/i, "GP")}
                          </h4>
                          <p className="mb-6 font-display text-[10px] uppercase tracking-widest text-paddock-on-muted/40">
                            {race.circuit}
                          </p>
                          <div className="flex items-center justify-between">
                            {isLocked ? (
                              <span className="font-display text-[10px] font-bold uppercase tracking-widest text-paddock-cyan">
                                Locked
                              </span>
                            ) : hasPrediction ? (
                              <span className="font-display text-[10px] font-bold uppercase tracking-widest text-paddock-cyan">
                                Predicted
                              </span>
                            ) : (
                              <span className="font-display text-[10px] font-bold uppercase tracking-widest text-paddock-warning">
                                Open
                              </span>
                            )}
                            {isLocked && (
                              <Lock className="h-3.5 w-3.5 text-paddock-on-muted/20" />
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Locked Races (collapsed by default) */}
          {lockedRaces.length > 0 && (
            <div className="room-overview-enter room-overview-enter-delay-4">
              <button
                type="button"
                onClick={() => setShowLockedRaces(!showLockedRaces)}
                className="mb-4 flex w-full items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="h-[2px] w-6 bg-paddock-on-muted/40" />
                  <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.25em] text-paddock-on-muted">
                    Past Races
                    <span className="ml-2 text-paddock-on-muted/50">
                      ({lockedRaces.length})
                    </span>
                  </h3>
                </div>
                {showLockedRaces ? (
                  <ChevronUp className="h-4 w-4 text-paddock-on-muted/50" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-paddock-on-muted/50" />
                )}
              </button>

              {showLockedRaces && (
                <div className="space-y-4">
                  {lockedRaces
                    .sort((a, b) => b.date - a.date)
                    .map((race) => {
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
                          defaultExpanded={race._id === mostRecentLockedRaceId}
                        />
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="room-overview-enter room-overview-enter-delay-2 space-y-6">
          {/* Prediction Status */}
          {nextRace && (
            <div className="rounded-sm bg-paddock-surface-low p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted">
                  Prediction Status
                </h3>
                {lockoutInfo?.locked ? (
                  <Lock className="h-4 w-4 text-paddock-warning" />
                ) : (
                  <div className="h-2 w-2 rounded-full bg-paddock-cyan" />
                )}
              </div>

              {(() => {
                const pred = userPredictions?.find(
                  (p) => p.raceId === nextRace._id
                );
                if (!pred) {
                  return (
                    <div className="space-y-3">
                      <p className="text-sm text-paddock-on-muted">
                        No prediction submitted for this race yet.
                      </p>
                      <Link
                        href={`/rooms/${roomId}/predictions/${nextRace._id}`}
                        className="block w-full rounded-sm bg-paddock-surface-high py-2.5 text-center font-display text-[10px] font-bold uppercase tracking-widest text-paddock-on transition-colors hover:bg-paddock-surface-highest"
                      >
                        Edit all picks
                      </Link>
                    </div>
                  );
                }

                const getDriverName = (num: number | undefined) => {
                  if (!num) return "—";
                  const d = drivers.find((d) => d.driverNumber === num);
                  return d
                    ? d.name.split(" ").pop()?.toUpperCase() || d.name
                    : `#${num}`;
                };

                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-sm bg-paddock-surface px-3 py-2">
                      <span className="font-display text-[9px] font-semibold uppercase tracking-widest text-paddock-on-muted">
                        Pole Position
                      </span>
                      <span className="font-display text-sm font-bold uppercase text-paddock-on">
                        {getDriverName(pred.polePositionDriverId)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-sm bg-paddock-surface px-3 py-2">
                      <span className="font-display text-[9px] font-semibold uppercase tracking-widest text-paddock-on-muted">
                        P1 Winner
                      </span>
                      <span className="font-display text-sm font-bold uppercase text-paddock-on">
                        {getDriverName(
                          pred.predictedPositions.find(
                            (p: { position: number }) => p.position === 1
                          )?.driverNumber
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-sm bg-paddock-surface px-3 py-2">
                      <span className="font-display text-[9px] font-semibold uppercase tracking-widest text-paddock-on-muted">
                        Fastest Lap
                      </span>
                      <span className="font-display text-sm font-bold uppercase text-paddock-on">
                        {getDriverName(pred.fastestLapDriverId)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-sm bg-paddock-surface px-3 py-2">
                      <span className="font-display text-[9px] font-semibold uppercase tracking-widest text-paddock-on-muted">
                        DNF Count
                      </span>
                      <span className="font-display text-sm font-bold uppercase text-paddock-on">
                        {String(pred.dnfDriverIds.length).padStart(2, "0")}
                      </span>
                    </div>
                    <Link
                      href={`/rooms/${roomId}/predictions/${nextRace._id}`}
                      className="block w-full rounded-sm bg-paddock-surface-high py-2.5 text-center font-display text-[10px] font-bold uppercase tracking-widest text-paddock-on transition-colors hover:bg-paddock-surface-highest"
                    >
                      Edit all picks
                    </Link>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Join Code */}
          <div className="rounded-sm bg-paddock-surface-low p-5">
            <h3 className="mb-3 font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted">
              Join Code
            </h3>
            <code className="block rounded-sm bg-paddock-surface-lowest px-3 py-2 text-center font-mono text-lg font-bold tracking-[0.3em] text-paddock-on">
              {room.joinCode}
            </code>
          </div>

          {/* League standings (top 5) */}
          <div className="rounded-sm bg-paddock-surface-low p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted">
                League Standings (Top 5)
              </h3>
              <Link
                href={`/rooms/${roomId}/results`}
                className="font-display text-[9px] font-semibold uppercase tracking-widest text-paddock-cyan transition-colors hover:text-paddock-cyan-soft"
              >
                View full rankings
              </Link>
            </div>
            <RoomLeaderboard leaderboard={leaderboard || []} compact />
          </div>

          {/* Host tools */}
          {isHost && lockedRaces.length > 0 && (
            <div className="rounded-sm bg-paddock-surface-low p-5">
              <h3 className="mb-3 font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted">
                Host Tools
              </h3>
              <SyncAllRacesButton races={lockedRaces} />
            </div>
          )}
        </div>
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
