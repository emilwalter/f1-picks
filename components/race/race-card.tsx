"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import Image from "next/image";
import type { Doc } from "@/convex/_generated/dataModel";
import { getCountryFlag, getCircuitImageUrl } from "@/lib/f1-images";

interface RaceCardProps {
  race: Doc<"races">;
  room?: Doc<"rooms">;
}

export function RaceCard({ race, room }: RaceCardProps) {
  return (
    <Card className="group overflow-hidden transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900">
      {/* Circuit Image Header */}
      <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-900">
        <Image
          src={getCircuitImageUrl(race.circuit)}
          alt={race.circuit}
          fill
          className="object-cover opacity-50 transition-opacity group-hover:opacity-70"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        <div className="absolute top-2 right-2 text-2xl">
          {getCountryFlag(race.country)}
        </div>
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2 text-base leading-tight">
            {race.name}
          </CardTitle>
          {room && (
            <Badge
              variant={room.status === "open" ? "default" : "outline"}
              className="shrink-0"
            >
              {room.status}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5 text-sm">
        <div className="min-w-0">
          <div className="truncate font-medium text-zinc-900 dark:text-zinc-50">
            {race.circuit}
          </div>
          <div className="truncate text-xs text-zinc-600 dark:text-zinc-400">
            {race.location}, {race.country}
          </div>
        </div>
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          {format(race.date, "MMM d, yyyy")}
        </div>
        {room && (
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Join Code
            </div>
            <code className="mt-1 block rounded bg-zinc-100 px-2 py-1.5 font-mono text-sm font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50">
              {room.joinCode}
            </code>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
