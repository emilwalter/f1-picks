"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Archive, LogOut } from "lucide-react";
import { toast } from "sonner";

export function ActiveRooms() {
  const router = useRouter();
  const currentUser = useQuery(api.queries.auth.getCurrentUser);
  const activeRooms = useQuery(
    api.queries.rooms.getUserActiveRooms,
    currentUser ? { userId: currentUser._id } : "skip"
  );
  const leaveRoom = useMutation(api.mutations.rooms.leaveRoom);
  const archiveRoom = useMutation(api.mutations.rooms.archiveRoom);
  const [removingRoomId, setRemovingRoomId] = useState<string | null>(null);

  if (currentUser === undefined || activeRooms === undefined) {
    return (
      <div className="text-center font-display text-sm uppercase tracking-widest text-paddock-on-muted">
        Loading...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="rounded-sm bg-paddock-surface-low p-8 text-center text-sm text-paddock-on-muted">
        Please sign in to view your active rooms.
      </div>
    );
  }

  if (activeRooms.length === 0) {
    return (
      <div className="rounded-sm bg-paddock-surface-low p-8 text-center text-sm text-paddock-on-muted">
        You don&apos;t have any active rooms. Create or join a room to get
        started!
      </div>
    );
  }

  const handleLeave = async (
    e: React.MouseEvent,
    roomId: Id<"rooms">,
    isHost: boolean
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setRemovingRoomId(roomId);
    try {
      if (isHost) {
        await archiveRoom({ roomId });
        toast.success("Room archived");
      } else {
        await leaveRoom({ roomId });
        toast.success("Left room");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove room"
      );
    } finally {
      setRemovingRoomId(null);
    }
  };

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {activeRooms.map(({ room, season }) => {
        if (!room || !season) return null;
        const isHost = room.hostId === currentUser._id;
        const isRemoving = removingRoomId === room._id;

        return (
          <div
            key={room._id}
            className="group cursor-pointer rounded-sm bg-paddock-surface-low transition-colors hover:bg-paddock-surface"
            onClick={() => router.push(`/rooms/${room._id}`)}
          >
            <div className="border-l-4 border-transparent px-5 py-4 transition-colors group-hover:border-paddock-cyan">
              <div className="mb-3 flex items-start justify-between gap-2">
                <h4 className="line-clamp-2 font-display text-sm font-bold uppercase tracking-wide text-paddock-on">
                  {room.name || `${season.year} Season Room`}
                </h4>
                <div
                  className="flex shrink-0 items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="rounded-sm p-1 text-paddock-on-muted transition-colors hover:bg-paddock-surface-high hover:text-paddock-on"
                        disabled={isRemoving}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => handleLeave(e, room._id, isHost)}
                        className="text-destructive focus:text-destructive"
                      >
                        {isHost ? (
                          <>
                            <Archive className="mr-2 h-4 w-4" />
                            Archive Room
                          </>
                        ) : (
                          <>
                            <LogOut className="mr-2 h-4 w-4" />
                            Leave Room
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted">
                    Season
                  </span>
                  <span className="font-display text-sm font-bold tabular-nums text-paddock-on">
                    {season.year}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted">
                    Races
                  </span>
                  <span className="font-display text-sm font-bold tabular-nums text-paddock-on">
                    {season.totalRaces}
                  </span>
                </div>
              </div>

              <div className="mt-3 rounded-sm bg-paddock-surface-lowest/50 px-3 py-2">
                <span className="font-display text-[9px] font-semibold uppercase tracking-widest text-paddock-on-muted">
                  Join code
                </span>
                <code className="mt-0.5 block font-mono text-sm font-bold tracking-[0.2em] text-paddock-on">
                  {room.joinCode}
                </code>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
