"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { Doc } from "@/convex/_generated/dataModel";

interface RoomHeaderProps {
  room: Doc<"rooms">;
  race: Doc<"races">;
}

export function RoomHeader({ room, race }: RoomHeaderProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl">{race.name}</CardTitle>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {race.circuit}, {race.location}
            </p>
          </div>
          <Badge
            variant={
              room.status === "open"
                ? "default"
                : room.status === "archived"
                  ? "outline"
                  : "outline"
            }
          >
            {room.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                Race Date:
              </span>{" "}
              <span className="text-zinc-600 dark:text-zinc-400">
                {format(race.date, "PPP 'at' p")}
              </span>
            </div>
            <div>
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                Join Code:
              </span>{" "}
              <code className="ml-2 rounded bg-zinc-100 px-2 py-1 font-mono text-lg dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50">
                {room.joinCode}
              </code>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
