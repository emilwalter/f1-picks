"use client";

import { useState } from "react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UpcomingRaces } from "@/components/dashboard/upcoming-races";
import { ActiveRooms } from "@/components/dashboard/active-rooms";
import { JoinRoomDialog } from "@/components/dashboard/join-room-dialog";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans dark:bg-black">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold text-black dark:text-zinc-50">
            F1 Picks
          </h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Authenticated>
              <UserButton />
            </Authenticated>
            <Unauthenticated>
              <SignInButton mode="modal">
                <button className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
                  Sign In
                </button>
              </SignInButton>
            </Unauthenticated>
          </div>
        </div>
      </header>

      <main className="container mx-auto flex-1 px-4 py-8">
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
      </main>
    </div>
  );
}

function DashboardContent() {
  const [activeTab, setActiveTab] = useState("upcoming");
  const currentUser = useQuery(api.queries.auth.getCurrentUser);
  const activeRooms = useQuery(
    api.queries.rooms.getUserActiveRooms,
    currentUser ? { userId: currentUser._id } : "skip",
  );

  const hasActiveRooms = activeRooms && activeRooms.length > 0;

  return (
    <>
      {/* Quick Actions Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
            Quick Actions
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Create a new room or join an existing one
          </p>
        </div>
        <div className="flex gap-2">
          <JoinRoomDialog />
          <Button variant="outline" onClick={() => setActiveTab("upcoming")}>
            Browse Races
          </Button>
          <Button asChild>
            <a href="/rooms/create">Create Room</a>
          </Button>
        </div>
      </div>

      {/* Welcome message if no active rooms */}
      {!hasActiveRooms && activeRooms !== undefined && (
        <Card className="mb-6 border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
          <CardContent className="py-8 text-center">
            <h3 className="mb-2 text-lg font-semibold text-black dark:text-zinc-50">
              Welcome to F1 Picks!
            </h3>
            <p className="mb-4 text-zinc-600 dark:text-zinc-400">
              Get started by creating a room for an upcoming race or joining a
              room with a join code.
            </p>
            <div className="flex justify-center gap-2">
              <JoinRoomDialog />
              <Button asChild>
                <a href="/rooms/create">Create Room</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        defaultValue={hasActiveRooms ? "active" : "upcoming"}
        className="w-full"
      >
        <TabsList className="mb-6">
          <TabsTrigger value="upcoming">Upcoming Races</TabsTrigger>
          <TabsTrigger value="active">
            Active Rooms
            {activeRooms && activeRooms.length > 0 && (
              <span className="ml-2 rounded-full bg-zinc-200 px-2 py-0.5 text-xs dark:bg-zinc-700">
                {activeRooms.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="standings">Season Standings</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          <UpcomingRaces />
        </TabsContent>

        <TabsContent value="active">
          <ActiveRooms />
        </TabsContent>

        <TabsContent value="standings">
          <div className="py-8 text-center text-zinc-600 dark:text-zinc-400">
            Season standings coming soon...
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
