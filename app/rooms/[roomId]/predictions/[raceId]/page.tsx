"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { Authenticated } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRoomPredictionPage } from "@/hooks/use-room-prediction-page";
import type { Id } from "@/convex/_generated/dataModel";
import { Countdown } from "@/components/ui/countdown";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { Lock } from "lucide-react";
import { useAction } from "convex/react";
import { getF1RaceStaticImagePaths } from "@/lib/f1-race-images";
import { getRaceStartTimestamp } from "@/lib/race-time";

const PredictionForm = dynamic(
  () =>
    import("@/components/room/prediction-form").then((m) => ({
      default: m.PredictionForm,
    })),
  {
    loading: () => (
      <div className="rounded-sm bg-paddock-surface-low p-8 text-center font-display text-sm uppercase tracking-widest text-paddock-on-muted">
        Loading form...
      </div>
    ),
  }
);

const PredictionSummary = dynamic(
  () =>
    import("@/components/room/prediction-summary").then((m) => ({
      default: m.PredictionSummary,
    })),
  {
    loading: () => (
      <div className="py-6 text-center font-display text-sm uppercase tracking-widest text-paddock-on-muted">
        Loading predictions...
      </div>
    ),
  }
);

export default function PredictionPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as Id<"rooms">;
  const raceId = params.raceId as Id<"races">;

  const [now] = useState(() => Date.now());

  const {
    room,
    season,
    selectedRace,
    currentUser,
    userPrediction,
    participants,
    isLoading,
  } = useRoomPredictionPage(roomId, raceId);

  const lockoutInfo = useQuery(api.queries.lockout.getRoomLockoutInfo, {
    roomId,
    raceId,
  });

  const allPredictions = useQuery(
    api.queries.predictions.getRoomRacePredictions,
    room && raceId ? { roomId, raceId } : "skip"
  );

  const isPast = selectedRace ? selectedRace.date < now : false;
  const isLocked = lockoutInfo?.locked || false;

  /** Past races with synced results: hub is the results page (pit wall, standings, scoring). */
  useEffect(() => {
    if (!selectedRace || selectedRace === null) return;
    if (!isPast || !selectedRace.officialResults) return;
    router.replace(`/rooms/${roomId}/results?raceId=${raceId}`);
  }, [selectedRace, isPast, roomId, raceId, router]);

  const getDriversForRace = useAction(api.actions.f1Connect.getDriversForRace);
  const [drivers, setDrivers] = useState<
    Array<{
      driverNumber: number;
      name: string;
      teamName: string;
      teamLogo?: string;
      countryCode: string;
    }>
  >([]);
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(true);

  useEffect(() => {
    const fetchDrivers = async () => {
      if (!selectedRace || !season || !isLocked) return;
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
  }, [selectedRace, season, isLocked, getDriversForRace]);

  if (isLoading || lockoutInfo === undefined) {
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
        <div className="rounded-sm bg-paddock-surface-low p-8 text-center font-display text-sm uppercase tracking-widest text-paddock-on-muted">
          {!room ? "Room not found" : "Season not found"}
        </div>
      </div>
    );
  }

  if (selectedRace === undefined) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center font-display text-sm uppercase tracking-widest text-paddock-on-muted">
          Loading...
        </div>
      </div>
    );
  }

  if (selectedRace === null) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="rounded-sm bg-paddock-surface-low p-8 text-center font-display text-sm uppercase tracking-widest text-paddock-on-muted">
          Race not found
        </div>
      </div>
    );
  }

  if (isPast && selectedRace.officialResults) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-16">
        <p className="text-center font-display text-sm uppercase tracking-widest text-paddock-on-muted">
          Opening race results…
        </p>
      </div>
    );
  }

  const isParticipant =
    currentUser && participants?.some((p) => p.userId === currentUser._id);

  const raceStartTime = getRaceStartTimestamp(selectedRace);
  const showRaceCountdown = raceStartTime > now;

  const f1Images = getF1RaceStaticImagePaths(season.year, selectedRace.round);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      {/* Breadcrumb */}
      <Link
        href={`/rooms/${roomId}`}
        className="mb-6 inline-flex min-h-11 items-center font-display text-[11px] font-semibold uppercase tracking-widest text-paddock-on-muted transition-colors hover:text-paddock-cyan active:text-paddock-cyan"
      >
        ← Room
      </Link>

      {f1Images && (
        <div className="relative mb-8 aspect-[16/9] w-full overflow-hidden rounded-sm bg-paddock-surface-highest md:aspect-[21/9]">
          <Image
            src={f1Images.card}
            alt=""
            fill
            className="object-cover object-center"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 100vw, 1280px"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-paddock-surface-low via-transparent to-transparent" />
          <div
            className="pointer-events-none absolute bottom-3 right-3 z-10 aspect-[5/3] w-[min(220px,46%)] sm:bottom-4 sm:right-4 sm:w-[min(280px,42%)]"
            aria-hidden
          >
            <Image
              src={f1Images.track}
              alt=""
              fill
              className="object-contain object-right-bottom drop-shadow-[0_4px_16px_rgba(0,0,0,0.45)]"
              sizes="280px"
            />
          </div>
        </div>
      )}

      {/* Page header — telemetry row (DESIGN.md: label-sm clusters, Space Grotesk numerals) */}
      <div className="mb-8">
        <div className="mb-6 flex flex-wrap items-start gap-x-8 gap-y-6">
          <div className="flex min-w-0 max-w-[min(100%,22rem)] items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full bg-paddock-accent" />
            <span className="font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-paddock-on-muted">
              {selectedRace.circuit} /{" "}
              {selectedRace.name.replace(/Grand Prix/i, "GP")}
            </span>
          </div>
          <div>
            <span className="block font-display text-[10px] uppercase tracking-widest text-paddock-on-muted">
              Round
            </span>
            <p className="font-display text-sm font-bold tabular-nums text-paddock-on">
              {String(selectedRace.round).padStart(2, "0")} /{" "}
              {season.totalRaces}
            </p>
          </div>
          {showRaceCountdown && (
            <Countdown
              targetTime={raceStartTime}
              label="Race start"
              expiredLabel="Started"
              timeClassName="font-display text-sm font-bold tabular-nums text-paddock-on"
              expiredClassName="font-display text-sm font-bold text-paddock-on-muted"
            />
          )}
          {lockoutInfo?.lockoutTime && lockoutInfo.lockoutTime > now && (
            <Countdown
              targetTime={lockoutInfo.lockoutTime}
              label="Picks lock"
              expiredLabel="Locked"
              timeClassName="font-display text-sm font-bold tabular-nums text-paddock-on"
              expiredClassName="font-display text-sm font-bold text-paddock-accent"
            />
          )}
        </div>

        <h1 className="font-display text-4xl font-black uppercase tracking-tighter text-paddock-on md:text-5xl">
          Predictions
        </h1>
        <p className="mt-3 max-w-lg text-base leading-relaxed text-paddock-on-muted sm:text-sm sm:leading-normal">
          Configure your technical strategy for the {selectedRace.name}. Point
          multipliers are active for early submission.
        </p>
      </div>

      {/* Locked/Past banner */}
      {(isLocked || isPast) && (
        <div className="mb-6 flex flex-col gap-3 rounded-sm border-l-4 border-paddock-accent bg-paddock-accent/[0.08] px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-paddock-accent" />
            <div className="min-w-0">
              <p className="font-display text-sm font-bold uppercase tracking-wide text-paddock-on">
                {isPast ? "Race complete" : "Predictions locked"}
              </p>
              <p className="mt-0.5 text-xs leading-snug text-paddock-on-muted">
                {isPast
                  ? "This race has already happened."
                  : lockoutInfo?.lockoutTime
                    ? `Locked at ${format(lockoutInfo.lockoutTime, "PPp")}`
                    : "The prediction deadline has passed."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Locked predictions summary */}
      {(isLocked || isPast) && allPredictions && allPredictions.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-4 border-l-4 border-paddock-cyan pl-3 font-display text-lg font-bold italic uppercase tracking-tight text-paddock-on">
            All Predictions
          </h2>
          {isLoadingDrivers ? (
            <div className="py-6 text-center font-display text-sm uppercase tracking-widest text-paddock-on-muted">
              Loading predictions...
            </div>
          ) : (
            <PredictionSummary
              race={selectedRace}
              predictions={allPredictions}
              drivers={drivers}
              participantCount={participants?.length || 0}
              isPast={isPast}
            />
          )}
        </div>
      )}

      {/* Prediction Form */}
      <Authenticated>
        {isParticipant ? (
          <PredictionForm
            room={room}
            race={selectedRace}
            seasonYear={season.year}
            currentPrediction={userPrediction}
            isLocked={isLocked}
            currentUser={currentUser}
            prefetchedDrivers={
              isLocked || isPast
                ? isLoadingDrivers
                  ? null
                  : drivers
                : undefined
            }
          />
        ) : (
          <div className="rounded-sm bg-paddock-surface-low p-8 text-center">
            <p className="mb-3 text-sm text-paddock-on-muted">
              You must join this room to submit predictions.
            </p>
            <p className="mb-5 text-sm text-paddock-on-muted">
              Join Code:{" "}
              <code className="font-mono font-bold tracking-wider text-paddock-on">
                {room.joinCode}
              </code>
            </p>
            <button
              type="button"
              onClick={() => router.push(`/rooms/${roomId}`)}
              className="min-h-11 rounded-sm bg-paddock-accent px-6 py-2.5 font-display text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-paddock-accent/90 active:bg-paddock-accent/80"
            >
              Go to Room
            </button>
          </div>
        )}
      </Authenticated>
    </div>
  );
}
