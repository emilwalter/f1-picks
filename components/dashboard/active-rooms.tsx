"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {activeRooms.map(({ room, season }) => {
        if (!room || !season) return null;
        const isHost = room.hostId === currentUser._id;
        const isRemoving = removingRoomId === room._id;

        return (
          <Card
            key={room._id}
            className="cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
            onClick={() => router.push(`/rooms/${room._id}`)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="line-clamp-2 text-base leading-tight">
                  {room.name || `${season.year} Season Room`}
                </CardTitle>
                <div
                  className="flex items-center gap-1 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Badge
                    variant={room.status === "open" ? "default" : "outline"}
                  >
                    {room.status}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={isRemoving}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
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
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">Season</span>
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
        );
      })}
    </div>
  );
}
