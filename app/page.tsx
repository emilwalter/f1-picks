"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ActiveRooms } from "@/components/dashboard/active-rooms";
import { LastRaceResults } from "@/components/dashboard/last-race-results";
import { JoinRoomDialog } from "@/components/dashboard/join-room-dialog";
import Link from "next/link";

export default function Home() {
  return (
    <div className="container mx-auto max-w-7xl flex-1 px-4 py-8">
      <AuthLoading>
        <div className="flex items-center justify-center py-12">
          <div className="font-display text-sm uppercase tracking-widest text-paddock-on-muted">
            Loading...
          </div>
        </div>
      </AuthLoading>

      <Unauthenticated>
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.25em] text-paddock-accent">
            Paddock engineering
          </p>
          <h2 className="mt-3 max-w-lg font-display text-3xl font-black italic uppercase tracking-tight text-paddock-on">
            Welcome to F1 Picks
          </h2>
          <p className="mb-10 mt-4 max-w-md text-paddock-on-muted">
            Make predictions and compete with friends on Formula 1 races. Sign
            in to get started.
          </p>
          <SignInButton mode="modal">
            <button
              type="button"
              className="rounded-sm bg-paddock-accent px-8 py-3 font-display text-[10px] font-bold uppercase tracking-widest text-white shadow-[0_0_24px_rgba(225,6,0,0.35)] transition-colors hover:bg-paddock-accent/90"
            >
              Sign in to continue
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
    currentUser ? { userId: currentUser._id } : "skip"
  );

  const hasActiveRooms = activeRooms && activeRooms.length > 0;

  return (
    <>
      <LastRaceResults />
      <div className="mb-8 flex flex-wrap items-center justify-between gap-6">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-bold italic uppercase tracking-tight text-paddock-on">
            <span className="h-6 w-1 shrink-0 bg-paddock-cyan" aria-hidden />
            Your rooms
          </h2>
          <p className="mt-1 max-w-xl text-sm text-paddock-on-muted">
            Create a room or join with a code. Predictions, synced results, and
            season leaderboard in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <JoinRoomDialog />
          <Link
            href="/rooms/create"
            className="rounded-sm bg-paddock-accent px-4 py-2.5 font-display text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-paddock-accent/90"
          >
            Create room
          </Link>
        </div>
      </div>

      {/* Empty state */}
      {!hasActiveRooms && activeRooms !== undefined && (
        <div className="mb-8 rounded-sm border-l-4 border-paddock-accent bg-paddock-surface-low p-8 text-center">
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-paddock-accent">
            No active rooms
          </p>
          <h3 className="mt-2 font-display text-2xl font-black italic uppercase tracking-tight text-paddock-on">
            Get on the grid
          </h3>
          <p className="mb-6 mt-2 text-sm text-paddock-on-muted">
            Create a room for the season or join with a join code.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <JoinRoomDialog />
            <Link
              href="/rooms/create"
              className="rounded-sm bg-paddock-accent px-5 py-2.5 font-display text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-paddock-accent/90"
            >
              Create room
            </Link>
          </div>
        </div>
      )}

      {/* Active Rooms */}
      {hasActiveRooms && (
        <div>
          <div className="mb-5">
            <h3 className="font-display text-lg font-bold italic uppercase tracking-tight text-paddock-on">
              Active rooms{" "}
              <span className="text-paddock-cyan">({activeRooms.length})</span>
            </h3>
          </div>
          <ActiveRooms />
        </div>
      )}
    </>
  );
}
