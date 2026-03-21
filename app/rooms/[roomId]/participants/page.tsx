"use client";

import { useParams } from "next/navigation";
import { useRoom } from "@/hooks/use-room";
import type { Id } from "@/convex/_generated/dataModel";
import { RoomParticipants } from "@/components/room/room-participants";
import Link from "next/link";
import { Users } from "lucide-react";

export default function ParticipantsPage() {
  const params = useParams();
  const roomId = params.roomId as Id<"rooms">;
  const { room, season, participants, isLoading } = useRoom(roomId);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center font-display text-sm uppercase tracking-widest text-paddock-on-muted">
          Loading...
        </div>
      </div>
    );
  }

  if (!room || !season) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center font-display text-sm uppercase tracking-widest text-paddock-on-muted">
          Room not found
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <Link
        href={`/rooms/${roomId}`}
        className="mb-6 inline-block font-display text-[11px] font-semibold uppercase tracking-widest text-paddock-on-muted transition-colors hover:text-paddock-cyan"
      >
        ← Room
      </Link>

      {/* Room header */}
      <div className="mb-8">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.25em] text-paddock-accent">
          {room.name || `${season.year} Season`}
        </p>
        <h1 className="mt-1 font-display text-3xl font-black italic uppercase tracking-tight text-paddock-on">
          Participants
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-paddock-on-muted" />
            <span className="font-display text-sm font-bold tabular-nums text-paddock-on">
              {participants?.length || 0}
            </span>
          </div>
          <div>
            <span className="font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted">
              Join Code
            </span>
            <code className="ml-2 rounded-sm bg-paddock-surface-lowest px-2 py-0.5 font-mono text-sm font-bold tracking-[0.2em] text-paddock-on">
              {room.joinCode}
            </code>
          </div>
        </div>
      </div>

      {/* Participants List */}
      <div className="rounded-sm bg-paddock-surface-low p-5">
        <RoomParticipants participants={participants || []} />
      </div>
    </div>
  );
}
