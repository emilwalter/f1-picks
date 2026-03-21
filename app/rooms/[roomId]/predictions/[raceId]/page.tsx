"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Authenticated } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRoom } from "@/hooks/use-room";
import type { Id } from "@/convex/_generated/dataModel";
import { PredictionForm } from "@/components/room/prediction-form";
import { PredictionSummary } from "@/components/room/prediction-summary";
import { Countdown } from "@/components/ui/countdown";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { Lock, Trophy } from "lucide-react";
import { useAction } from "convex/react";
import { getF1RaceStaticImagePaths } from "@/lib/f1-race-images";

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
  } = useRoom(roomId, raceId);

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

  const getDriversForRace = useAction(api.actions.openf1.getDriversForRace);
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

  if (!room || !season || !selectedRace) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="rounded-sm bg-paddock-surface-low p-8 text-center font-display text-sm uppercase tracking-widest text-paddock-on-muted">
          Room or race not found
        </div>
      </div>
    );
  }

  const isParticipant =
    currentUser && participants?.some((p) => p.userId === currentUser._id);

  const f1Images = getF1RaceStaticImagePaths(season.year, selectedRace.round);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      {/* Breadcrumb */}
      <Link
        href={`/rooms/${roomId}`}
        className="mb-6 inline-block font-display text-[11px] font-semibold uppercase tracking-widest text-paddock-on-muted transition-colors hover:text-paddock-cyan"
      >
        ← Room
      </Link>

      {f1Images && (
        <div className="relative mb-8 aspect-[21/9] w-full overflow-hidden rounded-sm bg-paddock-surface-highest">
          <Image
            src={f1Images.card}
            alt=""
            fill
            className="object-cover object-center"
            sizes="(max-width: 1280px) 100vw, 1280px"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-paddock-surface-low via-transparent to-transparent" />
        </div>
      )}

      {/* Page header with circuit & lockout (matches make_your_picks) */}
      <div className="mb-8">
        {/* Top bar: circuit location + lockout */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-paddock-accent" />
            <span className="font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-paddock-on-muted">
              {selectedRace.circuit} /{" "}
              {selectedRace.name.replace(/Grand Prix/i, "GP")}
            </span>
          </div>

          {lockoutInfo?.lockoutTime && lockoutInfo.lockoutTime > now && (
            <div className="text-right">
              <span className="font-display text-[9px] font-semibold uppercase tracking-widest text-paddock-accent">
                Lockout in
              </span>
              <Countdown
                targetTime={lockoutInfo.lockoutTime}
                label=""
                expiredLabel="Locked"
                className="!mb-0 font-display text-2xl font-black tabular-nums text-paddock-on [&>div:first-child]:hidden"
              />
            </div>
          )}
        </div>

        <h1 className="font-display text-4xl font-black uppercase tracking-tighter text-paddock-on md:text-5xl">
          Predictions
        </h1>
        <p className="mt-3 max-w-lg text-sm text-paddock-on-muted">
          Configure your technical strategy for the {selectedRace.name}. Point
          multipliers are active for early submission.
        </p>
      </div>

      {/* Locked/Past banner */}
      {(isLocked || isPast) && (
        <div className="mb-6 flex items-center gap-3 rounded-sm border-l-4 border-paddock-accent bg-paddock-accent/[0.08] px-5 py-4">
          <Lock className="h-4 w-4 shrink-0 text-paddock-accent" />
          <div>
            <p className="font-display text-sm font-bold uppercase tracking-wide text-paddock-on">
              {isPast ? "Race complete" : "Predictions locked"}
            </p>
            <p className="text-xs text-paddock-on-muted">
              {isPast
                ? "This race has already happened."
                : lockoutInfo?.lockoutTime
                  ? `Locked at ${format(lockoutInfo.lockoutTime, "PPp")}`
                  : "The prediction deadline has passed."}
            </p>
          </div>
          {selectedRace.officialResults && (
            <Link
              href={`/rooms/${roomId}/results?raceId=${raceId}`}
              className="ml-auto flex items-center gap-1.5 rounded-sm bg-paddock-accent px-3 py-2 font-display text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-paddock-accent/90"
            >
              <Trophy className="h-3.5 w-3.5" />
              Results
            </Link>
          )}
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
              className="rounded-sm bg-paddock-accent px-6 py-2.5 font-display text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-paddock-accent/90"
            >
              Go to Room
            </button>
          </div>
        )}
      </Authenticated>
    </div>
  );
}
