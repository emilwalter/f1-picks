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
import { SyncRaceResults } from "@/components/room/sync-race-results";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lock, Calendar, Trophy } from "lucide-react";
import { useAction } from "convex/react";

export default function PredictionPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as Id<"rooms">;
  const raceId = params.raceId as Id<"races">;

  // Initialize current time using useState with lazy initializer to avoid calling Date.now() during render
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

  // Get lockout info for this race
  const lockoutInfo = useQuery(api.queries.lockout.getRoomLockoutInfo, {
    roomId,
    raceId,
  });

  // Get all predictions for this race when locked
  const allPredictions = useQuery(
    api.queries.predictions.getRoomRacePredictions,
    room && raceId ? { roomId, raceId } : "skip",
  );

  const isPast = selectedRace ? selectedRace.date < now : false;
  const isLocked = lockoutInfo?.locked || false;

  // Fetch drivers for visualization
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

  // Fetch drivers when race is locked
  useEffect(() => {
    const fetchDrivers = async () => {
      if (!selectedRace || !isLocked) return;
      setIsLoadingDrivers(true);
      try {
        const raceDate = new Date(selectedRace.date)
          .toISOString()
          .split("T")[0];
        const driversData = await getDriversForRace({ date: raceDate });
        setDrivers(driversData);
      } catch (error) {
        console.error("Failed to fetch drivers:", error);
        setDrivers([]);
      } finally {
        setIsLoadingDrivers(false);
      }
    };
    fetchDrivers();
  }, [selectedRace, isLocked, getDriversForRace]);

  if (isLoading || lockoutInfo === undefined) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-zinc-600 dark:text-zinc-400">
          Loading...
        </div>
      </div>
    );
  }

  if (!room || !season || !selectedRace) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-8 text-center text-zinc-600 dark:text-zinc-400">
            Room or race not found
          </CardContent>
        </Card>
      </div>
    );
  }

  const isParticipant =
    currentUser && participants?.some((p) => p.userId === currentUser._id);

  const hasPrediction = !!userPrediction;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/rooms/${roomId}`}
          className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Back to Room
        </Link>
      </div>

      {/* Race Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="mb-1 text-2xl leading-tight">
                {selectedRace.name}
              </CardTitle>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {format(selectedRace.date, "MMMM d, yyyy")} •{" "}
                {selectedRace.circuit}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {season.year} Formula 1 World Championship
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {hasPrediction && (
                <Badge variant="default" className="text-sm">
                  ✓ Prediction Submitted
                </Badge>
              )}
              {isLocked && (
                <Badge variant="destructive" className="text-sm">
                  <Lock className="mr-1 h-3 w-3" />
                  Locked
                </Badge>
              )}
              {isPast && !isLocked && (
                <Badge variant="outline" className="text-sm">
                  <Calendar className="mr-1 h-3 w-3" />
                  Past Race
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Locked/Past Race Warning */}
      {(isLocked || isPast) && (
        <Alert className="mb-6" variant={isLocked ? "destructive" : "default"}>
          <Lock className="h-4 w-4" />
          <AlertTitle>
            {isPast
              ? "This race has already happened"
              : "Predictions are locked"}
          </AlertTitle>
          <AlertDescription>
            {isPast
              ? "You cannot submit predictions for races that have already occurred."
              : lockoutInfo?.lockoutTime
                ? `Predictions locked at ${format(
                    lockoutInfo.lockoutTime,
                    "PPp",
                  )}`
                : "The prediction deadline for this race has passed."}
          </AlertDescription>
        </Alert>
      )}

      {/* Sync Race Results - Host Only */}
      {isParticipant && currentUser && currentUser._id === room.hostId && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <SyncRaceResults
              room={room}
              race={selectedRace}
              currentUser={currentUser}
            />
          </CardContent>
        </Card>
      )}

      {/* Show all predictions when locked */}
      {(isLocked || isPast) && allPredictions && allPredictions.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Predictions</CardTitle>
              {selectedRace.officialResults && (
                <Link href={`/rooms/${roomId}/results?raceId=${raceId}`}>
                  <Button variant="outline" size="sm">
                    <Trophy className="mr-2 h-4 w-4" />
                    View Results
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingDrivers ? (
              <div className="py-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
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
          </CardContent>
        </Card>
      )}

      {/* Prediction Form */}
      <Authenticated>
        {isParticipant ? (
          <PredictionForm
            room={room}
            race={selectedRace}
            currentPrediction={userPrediction}
            isLocked={isLocked}
          />
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-zinc-600 dark:text-zinc-400">
              <p className="mb-4">
                You must join this room to submit predictions.
              </p>
              <p className="mb-4">
                Join Code:{" "}
                <strong className="font-mono">{room.joinCode}</strong>
              </p>
              <Button onClick={() => router.push(`/rooms/${roomId}`)}>
                Go to Room
              </Button>
            </CardContent>
          </Card>
        )}
      </Authenticated>
    </div>
  );
}
