"use client";

import { format } from "date-fns";
import type { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface RoomHeaderProps {
  room: Doc<"rooms">;
  race: Doc<"races">;
}

export function RoomHeader({ room, race }: RoomHeaderProps) {
  return (
    <div className="rounded-sm bg-paddock-surface-low p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-black italic uppercase tracking-tight text-paddock-on">
            {race.name}
          </h2>
          <p className="mt-1 text-sm text-paddock-on-muted">
            {race.circuit}, {race.location}
          </p>
        </div>
        <span
          className={cn(
            "rounded-sm px-2 py-0.5 font-display text-[9px] font-semibold uppercase tracking-widest",
            room.status === "open"
              ? "bg-paddock-cyan/15 text-paddock-cyan"
              : "bg-paddock-surface-high text-paddock-on-muted"
          )}
        >
          {room.status}
        </span>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-3">
            <span className="w-20 shrink-0 font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted">
              Race Date
            </span>
            <span className="text-paddock-on">
              {format(race.date, "PPP 'at' p")}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-20 shrink-0 font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted">
              Join Code
            </span>
            <code className="font-mono text-lg font-bold tracking-[0.2em] text-paddock-on">
              {room.joinCode}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
