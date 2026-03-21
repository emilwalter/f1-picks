"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { format } from "date-fns";
import { Trophy } from "lucide-react";
import { getF1RaceStaticImagePaths } from "@/lib/f1-race-images";

export function LastRaceResults() {
  const currentUser = useQuery(api.queries.auth.getCurrentUser);
  const latest = useQuery(
    api.queries.races.getDashboardLatestCompletedRace,
    currentUser ? { userId: currentUser._id } : "skip"
  );

  if (currentUser === undefined || latest === undefined) return null;

  if (!latest) {
    return (
      <div className="mb-8 rounded-sm border-l-4 border-paddock-accent bg-paddock-surface-low px-6 py-5">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-paddock-accent">
          Telemetry
        </p>
        <h3 className="mt-1 font-display text-lg font-bold italic uppercase tracking-tight text-paddock-on">
          Last Race Results
        </h3>
        <p className="mt-1 text-sm text-paddock-on-muted">
          When a race finishes and results are synced in one of your rooms, the
          latest race appears here.
        </p>
      </div>
    );
  }

  const f1Images = getF1RaceStaticImagePaths(latest.seasonYear, latest.round);

  return (
    <div className="mb-8 rounded-sm border-l-4 border-paddock-accent bg-paddock-surface-low">
      <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 gap-4">
          {f1Images && (
            <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-sm bg-paddock-surface-highest sm:h-24 sm:w-40">
              <Image
                src={f1Images.card}
                alt=""
                fill
                className="object-cover"
                sizes="160px"
              />
            </div>
          )}
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-sm bg-paddock-accent px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-tighter text-white">
                Synced
              </span>
              <span className="font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-cyan">
                {latest.roomName || "Your room"} ·{" "}
                {format(latest.date, "MMM d, yyyy")}
              </span>
            </div>
            <h3 className="font-display text-2xl font-black italic uppercase tracking-tight text-paddock-on">
              {latest.raceName}
            </h3>
            <p className="mt-1 text-sm text-paddock-on-muted">
              {latest.circuit}
            </p>
          </div>
        </div>
        <Link
          href={`/rooms/${latest.roomId}/results?raceId=${latest.raceId}`}
          className="flex shrink-0 items-center gap-1.5 rounded-sm bg-paddock-accent px-4 py-2.5 font-display text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-paddock-accent/90"
        >
          <Trophy className="h-3.5 w-3.5" />
          Open results
        </Link>
      </div>
      <div className="border-t border-white/[0.04] px-6 py-3">
        <Link
          href={`/rooms/${latest.roomId}`}
          className="font-display text-[11px] font-semibold uppercase tracking-widest text-paddock-cyan transition-colors hover:text-paddock-cyan-soft"
        >
          Go to room →
        </Link>
      </div>
    </div>
  );
}
