"use client";

import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { Lock } from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel";
import { getF1RaceStaticImagePaths } from "@/lib/f1-race-images";
export interface RoomRaceCardProps {
  race: Doc<"races">;
  seasonYear: number;
  /** Championship round index (1-based), e.g. 5 for R05 */
  displayRound: number;
  href: string;
  mode: "upcoming" | "past";
  /** Upcoming: lock / prediction state */
  isLocked?: boolean;
  hasPrediction?: boolean;
}

/**
 * Shared “Grand Prix card” for room overview — matches upcoming + past grids (DESIGN.md).
 */
export function RoomRaceCard({
  race,
  seasonYear,
  displayRound,
  href,
  mode,
  isLocked,
  hasPrediction,
}: RoomRaceCardProps) {
  const f1Images = getF1RaceStaticImagePaths(seasonYear, race.round);

  const footerUpcoming = () => {
    if (isLocked) {
      return (
        <>
          <span className="font-display text-[10px] font-bold uppercase tracking-widest text-paddock-cyan">
            Locked
          </span>
          <Lock className="h-3.5 w-3.5 text-paddock-on-muted/20" />
        </>
      );
    }
    if (hasPrediction) {
      return (
        <span className="font-display text-[10px] font-bold uppercase tracking-widest text-paddock-cyan">
          Predicted
        </span>
      );
    }
    return (
      <span className="font-display text-[10px] font-bold uppercase tracking-widest text-paddock-warning">
        Open
      </span>
    );
  };

  const footerPast = () => (
    <>
      <span className="font-display text-[10px] font-bold uppercase tracking-widest text-paddock-on-muted">
        Closed
      </span>
      <Lock className="h-3.5 w-3.5 shrink-0 text-paddock-on-muted/20" />
    </>
  );

  return (
    <Link
      href={href}
      className="group block min-h-[44px] origin-center transition-transform duration-300 ease-out hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100"
    >
      <div className="rounded-sm border-b-4 border-transparent bg-paddock-surface-low transition-[border-color,background-color] duration-300 ease-out group-hover:border-paddock-accent group-hover:bg-paddock-surface-high">
        {f1Images && (
          <div className="relative aspect-[16/7] w-full overflow-hidden rounded-t-sm bg-paddock-surface-highest">
            <Image
              src={f1Images.card}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, 25vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-paddock-surface-low to-transparent" />
          </div>
        )}
        <div className="p-5">
          <div className="mb-4 flex items-start justify-between gap-2">
            <span className="font-display text-[24px] font-black text-paddock-on/10">
              R{String(displayRound).padStart(2, "0")}
            </span>
            <span className="shrink-0 rounded-sm bg-paddock-surface-highest px-2 py-0.5 font-display text-[10px] uppercase tracking-widest text-paddock-on-muted">
              {format(race.date, "MMM dd")}
            </span>
          </div>
          <h4 className="mb-1 font-display text-lg font-bold uppercase tracking-tight text-paddock-on transition-colors group-hover:text-paddock-soft">
            {race.name.replace(/Grand Prix/i, "GP")}
          </h4>
          <p className="mb-6 font-display text-[10px] uppercase tracking-widest text-paddock-on-muted/40">
            {race.circuit}
          </p>
          <div className="flex min-h-7 items-center justify-between gap-2">
            {mode === "upcoming" ? footerUpcoming() : footerPast()}
          </div>
        </div>
      </div>
    </Link>
  );
}
