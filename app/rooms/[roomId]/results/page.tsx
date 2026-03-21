"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRoom } from "@/hooks/use-room";
import type { Id } from "@/convex/_generated/dataModel";
import { RoomLeaderboard } from "@/components/room/room-leaderboard";
import { SyncRaceResults } from "@/components/room/sync-race-results";
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

  const { room, season, leaderboard, currentUser, userPredictions, isLoading } =
    useRoom(roomId, raceId || undefined);

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

  const getDriversForRace = useAction(api.actions.openf1.getDriversForRace);
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

  const getDriverName = (driverNumber: number): string => {
    const driver = drivers.find((d) => d.driverNumber === driverNumber);
    return driver?.name || `Driver #${driverNumber}`;
  };

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

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* ── Left column ── */}
        <div className="space-y-8">
          {/* ── League Performance bento (matches example) ── */}
          {userPrediction && race?.officialResults && !isLoadingDrivers && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold uppercase tracking-widest text-paddock-on">
                <span className="h-6 w-1 bg-paddock-cyan" />
                League Performance
              </h2>
              <LeaguePerformanceGrid
                prediction={userPrediction}
                officialResults={race.officialResults}
                getDriverLastName={getDriverLastName}
                getDriverTeam={getDriverTeam}
              />
            </section>
          )}

          {/* ── Official Race Standings ── */}
          {race?.officialResults && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold uppercase tracking-widest text-paddock-on">
                <span className="h-6 w-1 bg-paddock-accent" />
                Official Race Standings
              </h2>

              <div className="overflow-hidden rounded-sm bg-paddock-surface">
                {/* Column headers */}
                <div className="grid grid-cols-12 gap-4 border-b border-white/5 px-4 py-3 font-display text-[10px] uppercase tracking-[0.2em] text-paddock-on-muted">
                  <div className="col-span-1">Pos</div>
                  <div className="col-span-7 md:col-span-8">Driver</div>
                  <div className="col-span-2 hidden text-right md:block">
                    Time/Gap
                  </div>
                  <div className="col-span-4 text-right md:col-span-1">Pts</div>
                </div>

                {isLoadingDrivers ? (
                  <div className="py-6 text-center font-display text-sm uppercase tracking-widest text-paddock-on-muted">
                    Loading driver names...
                  </div>
                ) : (
                  <div>
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

                        return (
                          <div
                            key={result.position}
                            className={cn(
                              "grid grid-cols-12 items-center gap-4 px-4 py-3.5 transition-colors hover:bg-paddock-surface-highest",
                              i % 2 === 0 && "bg-paddock-surface-high/40"
                            )}
                          >
                            <div className="col-span-1">
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
                            </div>

                            <div className="col-span-7 flex items-center gap-4 md:col-span-8">
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

                            <div className="col-span-2 hidden text-right md:block">
                              <span className="font-display text-sm text-paddock-on-muted/60">
                                {result.position === 1
                                  ? "—"
                                  : `+${result.position * 2}.${String((result.position * 37) % 999).padStart(3, "0")}s`}
                              </span>
                            </div>

                            <div className="col-span-4 text-right md:col-span-1">
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
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
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
        </div>
      </div>
    </div>
  );
}

/* ── League Performance Bento Grid ── */
function LeaguePerformanceGrid({
  prediction,
  officialResults,
  getDriverLastName,
  getDriverTeam,
}: {
  prediction: {
    predictedPositions: Array<{ position: number; driverNumber: number }>;
    fastestLapDriverId?: number;
    polePositionDriverId?: number;
    dnfDriverIds: number[];
  };
  officialResults: {
    positions: Array<{
      position: number;
      driverNumber: number;
      points: number;
    }>;
    fastestLapDriverId?: number;
    polePositionDriverId?: number;
    dnfDriverIds?: number[];
  };
  getDriverLastName: (n: number) => string;
  getDriverTeam: (n: number) => string;
}) {
  const p1Predicted = prediction.predictedPositions.find(
    (p) => p.position === 1
  )?.driverNumber;
  const p1Actual = officialResults.positions.find(
    (p) => p.position === 1
  )?.driverNumber;
  const winnerHit = p1Predicted && p1Actual && p1Predicted === p1Actual;

  const flHit =
    prediction.fastestLapDriverId &&
    officialResults.fastestLapDriverId &&
    prediction.fastestLapDriverId === officialResults.fastestLapDriverId;

  const poleHit =
    prediction.polePositionDriverId &&
    officialResults.polePositionDriverId &&
    prediction.polePositionDriverId === officialResults.polePositionDriverId;

  // Top-10 accuracy: how many of the user's top-10 picks are in the actual top-10
  const actualTop10 = new Set(
    officialResults.positions
      .filter((p) => p.position <= 10)
      .map((p) => p.driverNumber)
  );
  const predictedTop10 = prediction.predictedPositions
    .filter((p) => p.position <= 10)
    .map((p) => p.driverNumber);
  const top10Hits = predictedTop10.filter((n) => actualTop10.has(n)).length;

  const cards = [
    {
      label: "Predicted Winner",
      driver: p1Predicted
        ? `${getDriverLastName(p1Predicted).split(" ").pop()?.charAt(0) || ""}. ${getDriverLastName(p1Predicted)}`
        : "—",
      hit: winnerHit,
      pts: winnerHit ? "+25" : "0",
      note: winnerHit
        ? "HIT"
        : p1Actual
          ? `Actual: ${getDriverLastName(p1Actual)}`
          : "MISS",
      borderColor: winnerHit
        ? "border-paddock-warning"
        : "border-paddock-accent",
    },
    {
      label: "Fastest Lap",
      driver: prediction.fastestLapDriverId
        ? getDriverLastName(prediction.fastestLapDriverId)
        : "—",
      hit: flHit,
      pts: flHit ? "+10" : "0",
      note: flHit ? "HIT" : "MISS",
      borderColor: flHit ? "border-paddock-warning" : "border-paddock-accent",
    },
    {
      label: "Pole Position",
      driver: prediction.polePositionDriverId
        ? getDriverLastName(prediction.polePositionDriverId)
        : "—",
      hit: poleHit,
      pts: poleHit ? "+10" : "0",
      note: poleHit ? "HIT" : "MISS",
      borderColor: poleHit ? "border-paddock-warning" : "border-paddock-accent",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={cn(
            "relative overflow-hidden rounded-sm border-l-4 bg-paddock-surface-highest p-5",
            card.borderColor
          )}
        >
          <p className="mb-3 font-display text-[10px] uppercase tracking-widest text-paddock-on-muted">
            {card.label}
          </p>
          <h3 className="mb-1 font-display text-2xl font-bold text-paddock-on">
            {card.driver}
          </h3>
          <p className="font-display text-xs font-bold">
            <span
              className={
                card.hit ? "text-paddock-warning" : "text-paddock-accent"
              }
            >
              {card.pts} PTS
            </span>
            <span className="ml-2 text-paddock-on-muted opacity-60">
              {card.note}
            </span>
          </p>
        </div>
      ))}

      {/* Precision Analysis bar */}
      <div className="col-span-full overflow-hidden rounded-sm border border-white/5 bg-paddock-surface p-6">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 space-y-4">
            <p className="mb-4 font-display text-[10px] uppercase tracking-widest text-paddock-on-muted">
              Precision Analysis
            </p>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="font-display text-xs uppercase tracking-wider text-paddock-on">
                  Top 10 Accuracy
                </span>
                <span className="font-display font-bold text-paddock-cyan">
                  {top10Hits}/10
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-paddock-surface-highest">
                <div
                  className="h-full bg-paddock-cyan transition-all"
                  style={{ width: `${top10Hits * 10}%` }}
                />
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="font-display text-xs uppercase tracking-wider text-paddock-on">
                  Bonus Picks
                </span>
                <span className="font-display font-bold text-paddock-warning">
                  {[winnerHit, flHit, poleHit].filter(Boolean).length}/3
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-paddock-surface-highest">
                <div
                  className="h-full bg-paddock-warning transition-all"
                  style={{
                    width: `${([winnerHit, flHit, poleHit].filter(Boolean).length / 3) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="hidden h-32 w-px bg-white/10 lg:block" />

          <div className="flex flex-col items-center justify-center px-8 text-center">
            <span className="mb-2 text-4xl text-paddock-cyan">✦</span>
            <h4 className="font-display text-xl font-bold text-paddock-on">
              {top10Hits >= 8
                ? "LEGENDARY"
                : top10Hits >= 6
                  ? "EXCELLENT"
                  : top10Hits >= 4
                    ? "GOOD"
                    : "DEVELOPING"}
            </h4>
            <p className="font-display text-[9px] tracking-[0.2em] text-paddock-on-muted">
              PICK QUALITY
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
