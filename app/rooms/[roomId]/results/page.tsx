"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRoom } from "@/hooks/use-room";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { RoomLeaderboard } from "@/components/room/room-leaderboard";
import { YourPicksBreakdown } from "@/components/room/your-picks-breakdown";
import { SyncRaceResults } from "@/components/room/sync-race-results";
import {
  AvatarStack,
  type AvatarStackUser,
} from "@/components/ui/avatar-stack";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getTeamColor, getCountryFlag } from "@/lib/f1-images";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";

interface Driver {
  driverNumber: number;
  name: string;
  teamName: string;
}

export default function RoomResultsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.roomId as Id<"rooms">;
  const raceId = searchParams.get("raceId") as Id<"races"> | null;

  const {
    room,
    season,
    leaderboard,
    currentUser,
    userPredictions,
    participants,
    isLoading,
  } = useRoom(roomId, raceId || undefined);

  const racesWithResults = useQuery(
    api.queries.races.getSeasonRacesWithOfficialResults,
    room ? { seasonId: room.seasonId } : "skip"
  );

  const race = useQuery(
    api.queries.races.getRaceById,
    raceId ? { raceId } : "skip"
  );

  const raceLeaderboard = useQuery(
    api.queries.leaderboard.getRoomRaceLeaderboard,
    room && raceId ? { roomId, raceId } : "skip"
  );

  const roomRacePredictions = useQuery(
    api.queries.predictions.getRoomRacePredictions,
    room && raceId ? { roomId, raceId } : "skip"
  );

  const getDriversForRace = useAction(api.actions.f1Connect.getDriversForRace);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(true);

  useEffect(() => {
    const fetchDrivers = async () => {
      if (!race || !season) return;
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
  }, [race, season, getDriversForRace]);

  /** Pit wall: default “everyone” for small rooms; user can override. */
  const [showAllPitWall, setShowAllPitWall] = useState(false);
  const pitWallDefaultApplied = useRef(false);
  useEffect(() => {
    if (participants === undefined || pitWallDefaultApplied.current) return;
    pitWallDefaultApplied.current = true;
    if (participants.length > 0 && participants.length <= 8) {
      setShowAllPitWall(true);
    }
  }, [participants]);

  const getDriverFirstName = (driverNumber: number): string => {
    const driver = drivers.find((d) => d.driverNumber === driverNumber);
    if (!driver) return "";
    return driver.name.split(" ")[0]?.toUpperCase() || "";
  };

  const getDriverLastName = (driverNumber: number): string => {
    const driver = drivers.find((d) => d.driverNumber === driverNumber);
    if (!driver) return `#${driverNumber}`;
    const parts = driver.name.split(" ");
    return parts.length > 1
      ? parts.slice(1).join(" ").toUpperCase()
      : driver.name.toUpperCase();
  };

  const getDriverTeam = (driverNumber: number): string => {
    const driver = drivers.find((d) => d.driverNumber === driverNumber);
    return driver?.teamName || "";
  };

  if (
    isLoading ||
    (raceId && race === undefined) ||
    (!raceId && room && racesWithResults === undefined)
  ) {
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

  if (raceId && !race) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center font-display text-sm uppercase tracking-widest text-paddock-on-muted">
          Race not found
        </div>
      </div>
    );
  }

  if (raceId && race && !race.officialResults) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center font-display text-sm uppercase tracking-widest text-paddock-on-muted">
          Results not available yet for this race
        </div>
      </div>
    );
  }

  /* ── Race picker (no raceId selected) ── */
  if (!raceId) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-6">
        <Link
          href={`/rooms/${roomId}`}
          className="mb-6 inline-block font-display text-[11px] font-semibold uppercase tracking-widest text-paddock-on-muted transition-colors hover:text-paddock-cyan"
        >
          ← Room
        </Link>

        <div className="mb-8">
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.25em] text-paddock-accent">
            Season Results
          </p>
          <h1 className="mt-1 font-display text-3xl font-black italic uppercase tracking-tight text-paddock-on">
            Race Results & Scoring
          </h1>
          <p className="mt-2 text-sm text-paddock-on-muted">
            Choose a completed race with synced official results.
          </p>
        </div>

        {!racesWithResults || racesWithResults.length === 0 ? (
          <div className="rounded-sm bg-paddock-surface-low p-8 text-center text-sm text-paddock-on-muted">
            No official results synced yet. When a race finishes, the host can
            sync results from the prediction page.
          </div>
        ) : (
          <div className="space-y-1">
            {racesWithResults.map((r) => (
              <Link
                key={r._id}
                href={`/rooms/${roomId}/results?raceId=${r._id}`}
                className="group flex items-center justify-between rounded-sm bg-paddock-surface-low px-5 py-4 transition-colors hover:bg-paddock-surface"
              >
                <span className="font-display text-sm font-bold uppercase tracking-wide text-paddock-on group-hover:text-white">
                  {r.name}
                </span>
                <span className="font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-cyan">
                  {format(r.date, "MMM d, yyyy")} · {r.circuit}
                </span>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-10">
          <h2 className="mb-4 font-display text-lg font-bold italic uppercase tracking-tight text-paddock-on">
            Season Leaderboard
          </h2>
          <div className="rounded-sm bg-paddock-surface-low p-5">
            <RoomLeaderboard leaderboard={leaderboard || []} />
          </div>
        </div>
      </div>
    );
  }

  /* ── Full race results view ── */
  const allRaces = racesWithResults || [];
  const currentRaceIndex = allRaces.findIndex((r) => r._id === raceId);
  const raceRoundNum = race
    ? currentRaceIndex >= 0
      ? currentRaceIndex + 1
      : null
    : null;

  // Compute user prediction accuracy for this race
  const userPrediction = userPredictions?.find((p) => p.raceId === raceId);
  const userRaceEntry = raceLeaderboard?.find(
    (e) => e.userId === currentUser?._id
  );
  const userPointsEarned = userRaceEntry?.points ?? null;

  const showRoomColumn = roomRacePredictions !== undefined;

  // Split the GP name for the editorial typography
  const gpNameParts = race?.name?.match(/(.+?)\s*(Grand Prix)$/i);
  const locationPart = gpNameParts?.[1] || race?.name || "";
  const gpPart = gpNameParts?.[2] || "";
  const countryFlag = race?.country ? getCountryFlag(race.country) : "🏁";

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <Link
        href={`/rooms/${roomId}/results`}
        className="mb-6 inline-block font-display text-[11px] font-semibold uppercase tracking-widest text-paddock-on-muted transition-colors hover:text-paddock-cyan"
      >
        ← All Results
      </Link>

      {/* ── Hero Header (matches race_results_scoring example) ── */}
      {race && (
        <div className="relative mb-8 overflow-hidden rounded-sm border-l-4 border-paddock-accent bg-paddock-surface-low shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
          {/* Country flag watermark */}
          <div className="pointer-events-none absolute right-0 top-0 h-full w-1/3 select-none text-[16rem] leading-none opacity-[0.06]">
            <span className="absolute right-4 top-1/2 -translate-y-1/2">
              {countryFlag}
            </span>
          </div>

          <div className="relative z-10 flex flex-col gap-6 px-6 py-8 md:flex-row md:items-center md:justify-between md:px-10 md:py-10">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <span className="rounded-sm bg-paddock-accent px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-tighter text-white">
                  Finished
                </span>
                <span className="font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-cyan">
                  {race.circuit}
                  {raceRoundNum ? ` · Round ${raceRoundNum}` : ""}
                </span>
              </div>
              <h1 className="font-display text-4xl font-black uppercase tracking-tighter text-paddock-on md:text-5xl lg:text-6xl">
                {locationPart}{" "}
                {gpPart && (
                  <span className="italic text-paddock-accent">{gpPart}</span>
                )}
              </h1>
            </div>

            {currentUser && (
              <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-end sm:gap-5">
                <div className="flex items-center justify-end gap-3">
                  <div
                    className="relative shrink-0 rounded-full ring-2 ring-paddock-bg"
                    title={currentUser.username}
                  >
                    <UserAvatar
                      username={currentUser.username}
                      avatarUrl={currentUser.avatarUrl}
                      size="lg"
                      fallbackTone="accent"
                    />
                  </div>
                  <div className="min-w-0 text-right">
                    <p className="font-display text-[10px] uppercase tracking-widest text-paddock-on-muted">
                      You
                    </p>
                    <p className="truncate font-display text-xs font-semibold uppercase tracking-wide text-paddock-on">
                      {currentUser.username}
                    </p>
                  </div>
                </div>

                <div className="hidden h-14 w-px shrink-0 bg-white/10 sm:block" />

                <div className="flex flex-wrap items-center justify-end gap-3">
                  {userPointsEarned !== null && (
                    <div className="text-right">
                      <p className="font-display text-[10px] uppercase tracking-widest text-paddock-on-muted">
                        Points Earned
                      </p>
                      <div className="flex items-baseline justify-end gap-2">
                        <span className="font-display text-5xl font-black tracking-tight text-paddock-cyan">
                          +{userPointsEarned}
                        </span>
                        <span className="font-display text-sm text-paddock-cyan/60">
                          PTS
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* ── Left column ── */}
        <div className="space-y-8">
          {/* ── Official Race Standings ── */}
          {race?.officialResults && (
            <section id="room-picks-hub" className="scroll-mt-6">
              <h2 className="mb-2 flex items-center gap-2 font-display text-xl font-bold uppercase tracking-widest text-paddock-on">
                <span className="h-6 w-1 bg-paddock-accent" />
                Official Race Standings
              </h2>
              <p className="mb-3 text-sm text-paddock-on-muted">
                <span className="font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-paddock-on/80">
                  Room picks hub
                </span>
                <span className="mt-1 block">
                  Official results, points, and pit wall for this race.
                </span>
              </p>

              {showRoomColumn &&
                roomRacePredictions &&
                roomRacePredictions.length > 0 && (
                  <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/[0.06] pt-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="pit-wall-show-all"
                        checked={showAllPitWall}
                        onCheckedChange={setShowAllPitWall}
                        className="data-[state=checked]:bg-paddock-cyan"
                      />
                      <Label
                        htmlFor="pit-wall-show-all"
                        className="cursor-pointer font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on"
                      >
                        Show everyone
                      </Label>
                    </div>
                    <span className="min-w-0 font-display text-[9px] leading-snug text-paddock-on-muted">
                      {showAllPitWall
                        ? "Dim = picked another driver for this position."
                        : "Only players who matched this finishing slot."}
                    </span>
                  </div>
                )}

              <div className="rounded-sm bg-paddock-surface overflow-x-auto">
                {isLoadingDrivers ? (
                  <div className="py-6 text-center font-display text-sm uppercase tracking-widest text-paddock-on-muted">
                    Loading driver names...
                  </div>
                ) : (
                  <table className="w-full min-w-[520px] border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 font-display text-[10px] uppercase tracking-[0.2em] text-paddock-on-muted">
                        <th
                          scope="col"
                          className="w-11 py-3 pl-4 pr-1 text-left align-middle font-medium"
                        >
                          Pos
                        </th>
                        <th
                          scope="col"
                          className="min-w-0 py-3 pr-3 text-left align-middle font-medium"
                        >
                          Driver
                        </th>
                        {showRoomColumn && (
                          <th
                            scope="col"
                            className="min-w-[11rem] py-3 pr-3 text-left align-middle font-medium"
                          >
                            <span>Pit wall</span>
                          </th>
                        )}
                        <th
                          scope="col"
                          className="w-[4.5rem] py-3 pr-4 text-right align-middle font-medium tabular-nums"
                        >
                          Pts
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {race.officialResults.positions.map(
                        (
                          result: {
                            position: number;
                            driverNumber: number;
                            points: number;
                          },
                          i: number
                        ) => {
                          const isTop3 = result.position <= 3;
                          const teamName = getDriverTeam(result.driverNumber);
                          const teamColor = teamName
                            ? `#${getTeamColor(teamName)}`
                            : "#6B7280";

                          const matchers = roomRacePredictions
                            ? usersWhoMatchedSlot(
                                roomRacePredictions,
                                result.position,
                                result.driverNumber
                              )
                            : [];
                          const pitEntries = roomRacePredictions
                            ? pitWallSlotEntries(
                                roomRacePredictions,
                                result.position,
                                result.driverNumber
                              )
                            : [];
                          const pitStackUsers = showAllPitWall
                            ? pitEntries
                            : matchers.map((u) => ({
                                _id: u._id,
                                username: u.username,
                                avatarUrl: u.avatarUrl,
                              }));
                          const pitMatchedCount = pitEntries.filter(
                            (e) => !e.dimmed
                          ).length;

                          return (
                            <tr
                              key={result.position}
                              className={cn(
                                "transition-colors hover:bg-paddock-surface-highest",
                                i % 2 === 0 && "bg-paddock-surface-high/40"
                              )}
                            >
                              <td className="py-3.5 pl-4 pr-1 align-middle">
                                <span
                                  className={cn(
                                    "font-display text-xl font-black italic tabular-nums",
                                    result.position === 1
                                      ? "text-paddock-cyan"
                                      : isTop3
                                        ? "text-paddock-on"
                                        : "text-paddock-on-muted/60"
                                  )}
                                >
                                  {String(result.position).padStart(2, "0")}
                                </span>
                              </td>
                              <td className="min-w-0 py-3.5 pr-3 align-middle">
                                <div className="flex min-w-0 items-center gap-3 md:gap-4">
                                  <div
                                    className="h-8 w-1 shrink-0 rounded-full"
                                    style={{ backgroundColor: teamColor }}
                                  />
                                  <div className="min-w-0">
                                    <p className="font-display font-bold text-paddock-on">
                                      {getDriverFirstName(result.driverNumber)}{" "}
                                      <span className="text-xl font-black">
                                        {getDriverLastName(result.driverNumber)}
                                      </span>
                                    </p>
                                    <p className="font-display text-[9px] uppercase tracking-widest text-paddock-on-muted">
                                      {teamName}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              {showRoomColumn && (
                                <td className="min-w-[11rem] py-3.5 pr-3 align-middle">
                                  <div className="flex min-h-[2.75rem] flex-row flex-wrap items-center gap-x-1.5 gap-y-1">
                                    {pitStackUsers.length > 0 ? (
                                      <>
                                        <AvatarStack
                                          users={pitStackUsers}
                                          maxVisible={showAllPitWall ? 14 : 8}
                                          size="sm"
                                          emphasizeUserId={currentUser?._id}
                                          ariaLabel={
                                            showAllPitWall
                                              ? `${pitMatchedCount} matched this slot, ${pitStackUsers.length - pitMatchedCount} picked another driver for P${result.position}`
                                              : pitStackUsers.length === 1
                                                ? `${pitStackUsers[0]!.username} called P${result.position} correctly`
                                                : `${pitStackUsers.length} players called P${result.position} correctly`
                                          }
                                        />
                                        {!showAllPitWall &&
                                          pitStackUsers.length > 1 && (
                                            <span className="font-display text-[9px] font-bold tabular-nums tracking-widest text-paddock-on-muted">
                                              ×{pitStackUsers.length}
                                            </span>
                                          )}
                                        {showAllPitWall &&
                                          pitStackUsers.length > 1 && (
                                            <span className="font-display text-[9px] tabular-nums tracking-widest text-paddock-on-muted">
                                              {pitMatchedCount}/
                                              {pitStackUsers.length}
                                            </span>
                                          )}
                                      </>
                                    ) : (
                                      <span
                                        className="font-display text-[9px] uppercase tracking-widest text-paddock-on-muted/40"
                                        title="No one in this room called this slot"
                                      >
                                        —
                                      </span>
                                    )}
                                  </div>
                                </td>
                              )}
                              <td className="py-3.5 pr-4 text-right align-middle">
                                <span
                                  className={cn(
                                    "font-display text-lg font-black tabular-nums",
                                    isTop3
                                      ? "text-paddock-on"
                                      : "text-paddock-on-muted"
                                  )}
                                >
                                  {result.points}
                                </span>
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          )}

          {/* ── Race Leaderboard ── */}
          <section>
            <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold uppercase tracking-widest text-paddock-on">
              <span className="h-6 w-1 bg-paddock-cyan" />
              Race Leaderboard
            </h2>
            <div className="rounded-sm bg-paddock-surface-low p-5">
              {raceId && raceLeaderboard ? (
                <RoomLeaderboard
                  leaderboard={raceLeaderboard}
                  showBreakdown={true}
                />
              ) : (
                <RoomLeaderboard
                  leaderboard={leaderboard || []}
                  showBreakdown={false}
                />
              )}
            </div>
          </section>
        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-6">
          {race && (
            <SyncRaceResults
              room={room}
              race={race}
              currentUser={currentUser || null}
            />
          )}

          {/* Session Telemetry style (matches example sidebar) */}
          {race?.officialResults && (
            <div className="relative overflow-hidden rounded-sm bg-paddock-surface-low p-6 border border-white/5">
              <h3 className="mb-6 font-display text-lg font-bold uppercase tracking-widest text-paddock-on">
                Session Telemetry
              </h3>
              <div className="space-y-6">
                <div>
                  <p className="mb-1 font-display text-[10px] uppercase tracking-widest text-paddock-on-muted">
                    Fastest Lap
                  </p>
                  <p className="font-display text-xl font-bold text-paddock-on">
                    {race.officialResults.fastestLapDriverId
                      ? isLoadingDrivers
                        ? `Driver #${race.officialResults.fastestLapDriverId}`
                        : getDriverLastName(
                            race.officialResults.fastestLapDriverId
                          )
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="mb-1 font-display text-[10px] uppercase tracking-widest text-paddock-on-muted">
                    Pole Position
                  </p>
                  <p className="font-display text-xl font-bold text-paddock-on">
                    {race.officialResults.polePositionDriverId
                      ? isLoadingDrivers
                        ? `Driver #${race.officialResults.polePositionDriverId}`
                        : getDriverLastName(
                            race.officialResults.polePositionDriverId
                          )
                      : "N/A"}
                  </p>
                </div>
                {race.officialResults.dnfDriverIds &&
                  race.officialResults.dnfDriverIds.length > 0 && (
                    <div>
                      <p className="mb-1 font-display text-[10px] uppercase tracking-widest text-paddock-on-muted">
                        DNF Count
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-paddock-accent" />
                        <span className="font-display text-xl font-bold text-paddock-accent">
                          {String(
                            race.officialResults.dnfDriverIds.length
                          ).padStart(2, "0")}
                        </span>
                      </div>
                    </div>
                  )}
                <div>
                  <p className="mb-1 font-display text-[10px] uppercase tracking-widest text-paddock-on-muted">
                    Track Status
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-paddock-warning" />
                    <span className="font-display font-bold text-paddock-warning">
                      GREEN FLAG
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Championship Standings */}
          <div className="rounded-sm bg-paddock-surface p-6 border border-white/5">
            <h3 className="mb-6 font-display text-lg font-bold uppercase tracking-widest text-paddock-on">
              World Championship
            </h3>
            <RoomLeaderboard leaderboard={leaderboard || []} compact />
            <Link
              href={`/rooms/${roomId}/results`}
              className="mt-6 block w-full border border-paddock-cyan py-2.5 text-center font-display text-[10px] font-bold uppercase tracking-[0.3em] text-paddock-cyan transition-all hover:bg-paddock-cyan hover:text-paddock-bg"
            >
              View full rankings
            </Link>
          </div>

          {userPrediction && race?.officialResults && !isLoadingDrivers && (
            <div className="min-w-0">
              <YourPicksBreakdown
                variant="sidebar"
                prediction={userPrediction}
                officialResults={race.officialResults}
                getDriverLastName={getDriverLastName}
                getDriverTeam={getDriverTeam}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type PredictionWithUser = {
  predictedPositions: Array<{ position: number; driverNumber: number }>;
  fastestLapDriverId?: number;
  polePositionDriverId?: number;
  dnfDriverIds: number[];
  user: Doc<"users"> | null;
};

/** Room members who placed this driver in this exact finishing position. */
function usersWhoMatchedSlot(
  predictions: PredictionWithUser[],
  slotPosition: number,
  actualDriverNumber: number
): Doc<"users">[] {
  return predictions
    .filter((p) => {
      const pick = p.predictedPositions.find(
        (x) => x.position === slotPosition
      );
      return pick?.driverNumber === actualDriverNumber;
    })
    .map((p) => p.user)
    .filter((u): u is Doc<"users"> => u != null);
}

/** Everyone who submitted a pick for this slot; `dimmed` = wrong driver for this position. */
function pitWallSlotEntries(
  predictions: PredictionWithUser[],
  slotPosition: number,
  actualDriverNumber: number
): AvatarStackUser[] {
  const rows: AvatarStackUser[] = [];
  for (const p of predictions) {
    const u = p.user;
    if (!u) continue;
    const pick = p.predictedPositions.find((x) => x.position === slotPosition);
    if (!pick) continue;
    const matched = pick.driverNumber === actualDriverNumber;
    rows.push({
      _id: u._id,
      username: u.username,
      avatarUrl: u.avatarUrl,
      dimmed: !matched,
    });
  }
  rows.sort((a, b) => {
    const da = a.dimmed ? 1 : 0;
    const db = b.dimmed ? 1 : 0;
    if (da !== db) return da - db;
    return a.username.localeCompare(b.username);
  });
  return rows;
}
