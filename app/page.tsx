"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ActiveRooms } from "@/components/dashboard/active-rooms";
import { JoinRoomDialog } from "@/components/dashboard/join-room-dialog";
import Link from "next/link";

export default function Home() {
  return (
    <div className="container mx-auto flex-1 px-4 py-8">
      <AuthLoading>
        <div className="flex items-center justify-center py-12">
          <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
        </div>
      </AuthLoading>

      <Unauthenticated>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h2 className="mb-4 text-2xl font-semibold text-black dark:text-zinc-50">
            Welcome to F1 Picks
          </h2>
          <p className="mb-8 max-w-md text-zinc-600 dark:text-zinc-400">
            Make predictions and compete with friends on Formula 1 races. Sign
            in to get started!
          </p>
          <SignInButton mode="modal">
            <button className="rounded-md bg-black px-6 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
              Sign In to Continue
            </button>
          </SignInButton>
        </div>
      </Unauthenticated>

      <Authenticated>
        <DashboardContent />
      </Authenticated>
    </div>
  );
}

function DashboardContent() {
  const currentUser = useQuery(api.queries.auth.getCurrentUser);
  const activeRooms = useQuery(
    api.queries.rooms.getUserActiveRooms,
    currentUser ? { userId: currentUser._id } : "skip",
  );

  const hasActiveRooms = activeRooms && activeRooms.length > 0;

  return (
    <>
      {/* Header with actions */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">
            Your Rooms
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Create a new room or join an existing one to start making
            predictions
          </p>
        </div>
        <div className="flex gap-2">
          <JoinRoomDialog />
          <Button asChild>
            <Link href="/rooms/create">Create Room</Link>
          </Button>
        </div>
      </div>

      {/* Welcome message if no active rooms */}
      {!hasActiveRooms && activeRooms !== undefined && (
        <Card className="mb-8 border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
          <CardContent className="py-12 text-center">
            <h3 className="mb-2 text-xl font-semibold text-black dark:text-zinc-50">
              Welcome to F1 Picks!
            </h3>
            <p className="mb-6 text-zinc-600 dark:text-zinc-400">
              Get started by creating a room for an upcoming race or joining a
              room with a join code.
            </p>
            <div className="flex justify-center gap-3">
              <JoinRoomDialog />
              <Button asChild size="lg">
                <Link href="/rooms/create">Create Room</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Rooms */}
      <div>
        {hasActiveRooms && (
          <div className="mb-4">
            <h3 className="text-lg font-medium text-black dark:text-zinc-50">
              Active Rooms ({activeRooms.length})
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Click on a room to view predictions and leaderboard
            </p>
          </div>
        )}
        <ActiveRooms />
      </div>
    </>
  );
}
