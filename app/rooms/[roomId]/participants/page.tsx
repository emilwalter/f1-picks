"use client";

import { useParams } from "next/navigation";
import { useRoom } from "@/hooks/use-room";
import type { Id } from "@/convex/_generated/dataModel";
import { RoomParticipants } from "@/components/room/room-participants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Users } from "lucide-react";

export default function ParticipantsPage() {
  const params = useParams();
  const roomId = params.roomId as Id<"rooms">;
  const { room, season, participants, isLoading } = useRoom(roomId);

  if (isLoading) {
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

      {/* Room Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="mb-1 text-2xl leading-tight">
                {room.name || `${season.year} Season Room`}
              </CardTitle>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {season.year} Formula 1 World Championship
              </p>
            </div>
            <Badge
              variant={room.status === "open" ? "default" : "outline"}
              className="shrink-0"
            >
              {room.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">
                Join Code
              </div>
              <code className="block rounded bg-zinc-100 px-2 py-1.5 font-mono text-sm font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50">
                {room.joinCode}
              </code>
            </div>
            <div>
              <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">
                Participants
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {participants?.length || 0}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Participants List */}
      <Card>
        <CardHeader>
          <CardTitle>Participants</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <RoomParticipants participants={participants || []} />
        </CardContent>
      </Card>
    </div>
  );
}
