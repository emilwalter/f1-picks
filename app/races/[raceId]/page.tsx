"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Authenticated } from "convex/react";
import { RaceDetails } from "@/components/race/race-details";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function RacePage() {
  const params = useParams();
  const raceId = params.raceId as Id<"races">;

  const race = useQuery(api.queries.races.getRaceById, { raceId });
  // Get rooms for the season this race belongs to
  const rooms = useQuery(
    api.queries.rooms.getRoomsBySeason,
    race ? { seasonId: race.seasonId } : "skip"
  );

  if (race === undefined || rooms === undefined) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-zinc-600 dark:text-zinc-400">
          Loading...
        </div>
      </div>
    );
  }

  if (!race) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-zinc-600 dark:text-zinc-400">
          Race not found
        </div>
      </div>
    );
  }

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

      <RaceDetails race={race} />

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
            Rooms for {race.seasonId ? "this Season" : "this Race"}
          </h2>
          <Authenticated>
            <Link href="/rooms/create">
              <Button>Create Room</Button>
            </Link>
          </Authenticated>
        </div>

        {rooms && rooms.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-zinc-600 dark:text-zinc-400">
              No rooms yet for this season. Create one to get started!
            </CardContent>
          </Card>
        ) : rooms ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <Link key={room._id} href={`/rooms/${room._id}`}>
                <Card className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {room.name || `${race.seasonId ? "Season" : "Race"} Room`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <div>
                        <span className="font-medium">Join Code:</span>{" "}
                        <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-800">
                          {room.joinCode}
                        </code>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
