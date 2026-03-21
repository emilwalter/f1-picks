"use client";

import Image from "next/image";
import { format } from "date-fns";
import type { Doc } from "@/convex/_generated/dataModel";
import { getF1RaceStaticImagePaths } from "@/lib/f1-race-images";

interface RaceDetailsProps {
  race: Doc<"races"> & { seasonYear?: number };
}

export function RaceDetails({ race }: RaceDetailsProps) {
  const f1Images =
    race.seasonYear !== undefined
      ? getF1RaceStaticImagePaths(race.seasonYear, race.round)
      : null;

  return (
    <div className="rounded-sm bg-paddock-surface-low p-6">
      {f1Images && (
        <div className="mb-6 space-y-4">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-sm bg-paddock-surface-highest">
            <Image
              src={f1Images.card}
              alt=""
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 896px"
            />
          </div>
          <div className="relative mx-auto aspect-[2/1] w-full max-w-lg">
            <Image
              src={f1Images.track}
              alt={`${race.circuit} layout`}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 512px"
            />
          </div>
        </div>
      )}
      <h1 className="font-display text-2xl font-black italic uppercase tracking-tight text-paddock-on">
        {race.name}
      </h1>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <DetailRow label="Circuit" value={race.circuit} />
          <DetailRow label="Location" value={race.location} />
          <DetailRow label="Country" value={race.country} />
        </div>
        <div className="space-y-2">
          <DetailRow label="Date" value={format(race.date, "PPP 'at' p")} />
          {race.weatherForecast && (
            <div className="flex items-center gap-3">
              <span className="w-20 shrink-0 font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted">
                Weather
              </span>
              <div className="flex items-center gap-2">
                <span className="rounded-sm bg-paddock-surface-high px-2 py-0.5 font-display text-[9px] font-semibold uppercase tracking-widest text-paddock-on-muted">
                  {race.weatherForecast.condition}
                </span>
                <span className="text-sm text-paddock-on-muted">
                  {race.weatherForecast.temperature}°C
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted">
        {label}
      </span>
      <span className="text-sm text-paddock-on">{value}</span>
    </div>
  );
}
