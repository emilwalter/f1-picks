"use client";

import { cn } from "@/lib/utils";
import type { Doc } from "@/convex/_generated/dataModel";

interface ParticipantWithUser {
  _id: string;
  roomId: string;
  userId: string;
  role: "host" | "participant";
  joinedAt: number;
  user: Doc<"users"> | null;
}

interface RoomParticipantsProps {
  participants: ParticipantWithUser[];
}

export function RoomParticipants({ participants }: RoomParticipantsProps) {
  return (
    <div className="space-y-1">
      {participants.map((participant) => {
        const user = participant.user;
        const username = user?.username || "Unknown";
        const initials = username
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);
        const isHost = participant.role === "host";

        return (
          <div
            key={participant._id}
            className={cn(
              "flex items-center gap-3 rounded-sm px-4 py-3",
              isHost &&
                "border-l-4 border-paddock-accent bg-paddock-accent/[0.06]",
              !isHost && "border-l-4 border-transparent"
            )}
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold",
                isHost
                  ? "bg-paddock-accent/20 text-paddock-accent"
                  : "bg-paddock-surface-high text-paddock-on-muted"
              )}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <span className="block truncate font-display text-sm font-bold uppercase tracking-wide text-paddock-on">
                {username}
              </span>
            </div>
            {isHost && (
              <span className="rounded-sm bg-paddock-accent/20 px-2 py-0.5 font-display text-[9px] font-semibold uppercase tracking-widest text-paddock-accent">
                Host
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
