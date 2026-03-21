"use client";

import Image from "next/image";
import { format } from "date-fns";
import type { Doc } from "@/convex/_generated/dataModel";
import { getCountryFlag } from "@/lib/f1-images";
import { getF1RaceStaticImagePaths } from "@/lib/f1-race-images";

interface RaceCardProps {
  race: Doc<"races"> & { seasonYear?: number };
  room?: Doc<"rooms">;
}

export function RaceCard({ race, room }: RaceCardProps) {
  const f1Images =
    race.seasonYear !== undefined
      ? getF1RaceStaticImagePaths(race.seasonYear, race.round)
      : null;

  return (
    <div className="group overflow-hidden rounded-sm bg-paddock-surface-low transition-all hover:bg-paddock-surface-high">
      <div className="relative h-24 w-full overflow-hidden bg-gradient-to-br from-paddock-surface-high via-paddock-surface to-paddock-surface-lowest">
        {f1Images && (
          <Image
            src={f1Images.card}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 360px"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-paddock-surface-low/80 to-transparent" />
        <div className="absolute right-3 top-3 text-2xl leading-none drop-shadow-sm">
          {getCountryFlag(race.country)}
        </div>
      </div>

      <div className="px-4 py-3">
        <h4 className="line-clamp-2 font-display text-sm font-bold uppercase tracking-wide text-paddock-on">
          {race.name}
        </h4>
        <p className="mt-1 truncate text-xs text-paddock-on-muted">
          {race.circuit}
        </p>
        <p className="truncate text-xs text-paddock-on-muted">
          {race.location}, {race.country}
        </p>
        <p className="mt-2 font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted">
          {format(race.date, "MMM d, yyyy")}
        </p>
        {room && (
          <div className="mt-3 border-t border-white/[0.04] pt-3">
            <span className="font-display text-[9px] font-semibold uppercase tracking-widest text-paddock-on-muted">
              Join code
            </span>
            <code className="mt-0.5 block font-mono text-sm font-bold tracking-[0.2em] text-paddock-on">
              {room.joinCode}
            </code>
          </div>
        )}
      </div>
    </div>
  );
}
