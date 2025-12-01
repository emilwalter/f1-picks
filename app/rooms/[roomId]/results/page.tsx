"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRoom } from "@/hooks/use-room";
import type { Id } from "@/convex/_generated/dataModel";
import { RoomLeaderboard } from "@/components/room/room-leaderboard";
import { SyncRaceResults } from "@/components/room/sync-race-results";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

  const { room, season, leaderboard, currentUser, isLoading } = useRoom(
    roomId,
    raceId || undefined
  );

  // Get the specific race if raceId is provided
  const race = useQuery(
    api.queries.races.getRaceById,
    raceId ? { raceId } : "skip"
  );

  // Get race-specific leaderboard if raceId provided
  const raceLeaderboard = useQuery(
    api.queries.leaderboard.getRoomRaceLeaderboard,
    room && raceId ? { roomId, raceId } : "skip"
  );

  // Fetch drivers for displaying names
  const getDriversForRace = useAction(api.actions.openf1.getDriversForRace);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(true);

  useEffect(() => {
    const fetchDrivers = async () => {
      if (!race) return;
      setIsLoadingDrivers(true);
      try {
        const raceDate = new Date(race.date).toISOString().split("T")[0];
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
  }, [race, getDriversForRace]);

  // Helper function to get driver name by number
  const getDriverName = (driverNumber: number): string => {
    const driver = drivers.find((d) => d.driverNumber === driverNumber);
    return driver?.name || `Driver #${driverNumber}`;
  };

  if (isLoading || (raceId && race === undefined)) {
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

  if (raceId && !race) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-zinc-600 dark:text-zinc-400">
          Race not found
        </div>
      </div>
    );
  }

  // If raceId provided, check if results are available
  if (raceId && race && !race.officialResults) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-zinc-600 dark:text-zinc-400">
          Results are not available yet for this race
        </div>
      </div>
    );
  }

  // If no raceId, show message to select a race
  if (!raceId) {
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
        <Card>
          <CardContent className="py-8 text-center text-zinc-600 dark:text-zinc-400">
            Please select a race to view results. Go back to the room and click
            on a race.
          </CardContent>
        </Card>
      </div>
    );
  }

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
      {race && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">{race.name}</CardTitle>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {format(race.date, "MMMM d, yyyy")} • {race.circuit}
            </p>
          </CardHeader>
        </Card>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {race?.officialResults && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Official Results</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Position</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingDrivers ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center text-zinc-600 dark:text-zinc-400"
                        >
                          Loading driver names...
                        </TableCell>
                      </TableRow>
                    ) : (
                      race.officialResults.positions.map(
                        (result: {
                          position: number;
                          driverNumber: number;
                          points: number;
                        }) => (
                          <TableRow key={result.position}>
                            <TableCell>{result.position}</TableCell>
                            <TableCell>
                              {getDriverName(result.driverNumber)}
                            </TableCell>
                            <TableCell>{result.points}</TableCell>
                          </TableRow>
                        )
                      )
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>
                {raceId ? "Race Leaderboard" : "Season Leaderboard"}
              </CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Sync Results Component (for hosts) */}
          {race && (
            <SyncRaceResults
              room={room}
              race={race}
              currentUser={currentUser || null}
            />
          )}

          {race?.officialResults && (
            <Card>
              <CardHeader>
                <CardTitle>Race Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Fastest Lap:</span>{" "}
                  {race.officialResults.fastestLapDriverId
                    ? isLoadingDrivers
                      ? `Driver #${race.officialResults.fastestLapDriverId}`
                      : getDriverName(race.officialResults.fastestLapDriverId)
                    : "N/A"}
                </div>
                <div>
                  <span className="font-medium">Pole Position:</span>{" "}
                  {race.officialResults.polePositionDriverId
                    ? isLoadingDrivers
                      ? `Driver #${race.officialResults.polePositionDriverId}`
                      : getDriverName(race.officialResults.polePositionDriverId)
                    : "N/A"}
                </div>
                {race.officialResults.dnfDriverIds &&
                  race.officialResults.dnfDriverIds.length > 0 && (
                    <div>
                      <span className="font-medium">DNF:</span>{" "}
                      {isLoadingDrivers
                        ? race.officialResults.dnfDriverIds
                            .map((id: number) => `#${id}`)
                            .join(", ")
                        : race.officialResults.dnfDriverIds
                            .map((id: number) => getDriverName(id))
                            .join(", ")}
                    </div>
                  )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
