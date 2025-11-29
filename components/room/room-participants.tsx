"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
    <div>
      <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Participants ({participants.length})
      </h3>
      <div className="space-y-2">
        {participants.map((participant) => {
          const user = participant.user;
          const username = user?.username || "Unknown";
          const initials = username
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

          return (
            <div
              key={participant._id}
              className="flex items-center gap-3 rounded-lg border border-zinc-200 p-2.5 dark:border-zinc-800"
            >
              <Avatar className="h-9 w-9 shrink-0">
                {user?.avatarUrl && (
                  <AvatarImage src={user.avatarUrl} alt={username} />
                )}
                <AvatarFallback className="text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                    {username}
                  </span>
                  {participant.role === "host" && (
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      Host
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
