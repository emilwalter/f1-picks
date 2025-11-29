"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RaceCard } from "@/components/race/race-card";
import { Card, CardContent } from "@/components/ui/card";
import { SyncRacesButton } from "@/components/dashboard/sync-races-button";

export function UpcomingRaces() {
  const races = useQuery(api.queries.races.getUpcomingRaces, { limit: 10 });

  if (races === undefined) {
    return (
      <div className="text-center text-zinc-600 dark:text-zinc-400">
        Loading...
      </div>
    );
  }

  if (races.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="mb-4 text-zinc-600 dark:text-zinc-400">
            No upcoming races found. Sync races from OpenF1 API to get started!
          </p>
          <SyncRacesButton />
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Click on a race to view details and create or join a room.
        </p>
        <SyncRacesButton />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {races.map((race) => (
          <a key={race._id} href={`/races/${race._id}`} className="block">
            <RaceCard race={race} />
          </a>
        ))}
      </div>
    </div>
  );
}
