"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-black">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <Link href="/">
          <h1 className="text-2xl font-bold text-black dark:text-zinc-50">
            F1 Picks
          </h1>
        </Link>
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
  );
}
