"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Authenticated } from "convex/react";
import { RaceDetails } from "@/components/race/race-details";
import Link from "next/link";

export default function RacePage() {
  const params = useParams();
  const raceId = params.raceId as Id<"races">;

  const race = useQuery(api.queries.races.getRaceById, { raceId });
  const rooms = useQuery(
    api.queries.rooms.getRoomsBySeason,
    race ? { seasonId: race.seasonId } : "skip"
  );

  if (race === undefined || rooms === undefined) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center font-display text-sm uppercase tracking-widest text-paddock-on-muted">
          Loading...
        </div>
      </div>
    );
  }

  if (!race) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center font-display text-sm uppercase tracking-widest text-paddock-on-muted">
          Race not found
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <Link
        href="/"
        className="mb-6 inline-block font-display text-[11px] font-semibold uppercase tracking-widest text-paddock-on-muted transition-colors hover:text-paddock-cyan"
      >
        ← Dashboard
      </Link>

      <RaceDetails race={race} />

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold italic uppercase tracking-tight text-paddock-on">
            <span className="h-5 w-1 shrink-0 bg-paddock-cyan" aria-hidden />
            Rooms for this Season
          </h2>
          <Authenticated>
            <Link
              href="/rooms/create"
              className="rounded-sm bg-paddock-accent px-4 py-2 font-display text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-paddock-accent/90"
            >
              Create Room
            </Link>
          </Authenticated>
        </div>

        {rooms && rooms.length === 0 ? (
          <div className="rounded-sm bg-paddock-surface-low p-8 text-center text-sm text-paddock-on-muted">
            No rooms yet for this season. Create one to get started!
          </div>
        ) : rooms ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <Link key={room._id} href={`/rooms/${room._id}`}>
                <div className="rounded-sm bg-paddock-surface-low px-5 py-4 transition-colors hover:bg-paddock-surface">
                  <h4 className="font-display text-sm font-bold uppercase tracking-wide text-paddock-on">
                    {room.name || "Season Room"}
                  </h4>
                  <div className="mt-2">
                    <span className="font-display text-[9px] font-semibold uppercase tracking-widest text-paddock-on-muted">
                      Join code
                    </span>
                    <code className="mt-0.5 block font-mono text-sm font-bold tracking-[0.2em] text-paddock-on">
                      {room.joinCode}
                    </code>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
