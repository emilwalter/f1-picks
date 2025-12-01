"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export function ActiveRooms() {
  const currentUser = useQuery(api.queries.auth.getCurrentUser);
  const activeRooms = useQuery(
    api.queries.rooms.getUserActiveRooms,
    currentUser ? { userId: currentUser._id } : "skip"
  );

  if (currentUser === undefined || activeRooms === undefined) {
    return (
      <div className="text-center text-zinc-600 dark:text-zinc-400">
        Loading...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-zinc-600 dark:text-zinc-400">
          Please sign in to view your active rooms.
        </CardContent>
      </Card>
    );
  }

  if (activeRooms.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-zinc-600 dark:text-zinc-400">
          You don&apos;t have any active rooms. Create or join a room to get
          started!
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {activeRooms.map(({ room, season }) => {
        if (!room || !season) return null;

        return (
          <Link key={room._id} href={`/rooms/${room._id}`}>
            <Card className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="line-clamp-2 text-base leading-tight">
                    {room.name || `${season.year} Season Room`}
                  </CardTitle>
                  <Badge
                    variant={room.status === "open" ? "default" : "outline"}
                    className="shrink-0"
                  >
                    {room.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Season
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {season.year}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Total Races
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {season.totalRaces}
                  </span>
                </div>
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="mb-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    Join Code
                  </div>
                  <code className="block rounded bg-zinc-100 px-2 py-1.5 font-mono text-sm font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50">
                    {room.joinCode}
                  </code>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
