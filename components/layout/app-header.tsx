"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const nav = [{ href: "/", label: "Dashboard" }];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-gradient-to-b from-paddock-bg to-paddock-bg/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-8">
          <Link href="/" className="group shrink-0">
            <span className="font-display text-lg font-black italic tracking-tighter text-paddock-accent">
              F1 PICKS
            </span>
            <span className="ml-1.5 hidden font-display text-[10px] font-medium uppercase tracking-[0.2em] text-paddock-on-muted sm:inline">
              Paddock
            </span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex" aria-label="Main">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "font-display text-[10px] font-semibold uppercase tracking-widest transition-colors",
                    active
                      ? "border-b-2 border-paddock-accent pb-0.5 text-paddock-soft"
                      : "text-paddock-on opacity-80 hover:text-paddock-cyan"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Authenticated>
            <UserButton />
          </Authenticated>
          <Unauthenticated>
            <SignInButton mode="modal">
              <button
                type="button"
                className="rounded-sm bg-paddock-accent px-4 py-2 font-display text-[11px] font-bold uppercase tracking-widest text-white shadow-[0_0_20px_rgba(225,6,0,0.25)] transition hover:bg-paddock-accent/90"
              >
                Sign in
              </button>
            </SignInButton>
          </Unauthenticated>
        </div>
      </div>
    </header>
  );
}
