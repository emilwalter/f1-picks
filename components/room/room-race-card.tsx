"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { Lock, Ban, Undo2 } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { getF1RaceStaticImagePaths } from "@/lib/f1-race-images";

export interface RoomRaceCardProps {
  race: Doc<"races">;
  seasonYear: number;
  displayRound: number;
  href: string;
  mode: "upcoming" | "past";
  isLocked?: boolean;
  hasPrediction?: boolean;
  isHost?: boolean;
  roomId?: Id<"rooms">;
}

export function RoomRaceCard({
  race,
  seasonYear,
  displayRound,
  href,
  mode,
  isLocked,
  hasPrediction,
  isHost,
  roomId,
}: RoomRaceCardProps) {
  const f1Images = getF1RaceStaticImagePaths(seasonYear, race.round);
  const isCancelled = race.status === "cancelled";
  const [isMutating, setIsMutating] = useState(false);
  const setRaceStatus = useMutation(api.mutations.races.setRaceStatus);

  const handleToggleCancelled = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!roomId || isMutating) return;

    setIsMutating(true);
    try {
      const newStatus = isCancelled ? "scheduled" : "cancelled";
      await setRaceStatus({
        roomId,
        raceId: race._id,
        status: newStatus,
      });
      toast.success(
        isCancelled
          ? `${race.name} reinstated`
          : `${race.name} marked as cancelled`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update race status"
      );
    } finally {
      setIsMutating(false);
    }
  };

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

  const footerCancelled = () => (
    <>
      <span className="font-display text-[10px] font-bold uppercase tracking-widest text-paddock-accent">
        Cancelled
      </span>
      <Ban className="h-3.5 w-3.5 shrink-0 text-paddock-accent/40" />
    </>
  );

  const hostAction = isHost && roomId && (
    <button
      type="button"
      onClick={handleToggleCancelled}
      disabled={isMutating}
      className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-sm bg-paddock-surface-low/80 px-2 py-1 font-display text-[9px] font-bold uppercase tracking-widest text-paddock-on-muted opacity-0 backdrop-blur-sm transition-opacity hover:text-paddock-on group-hover:opacity-100 disabled:opacity-50"
    >
      {isCancelled ? (
        <>
          <Undo2 className="h-2.5 w-2.5" />
          Reinstate
        </>
      ) : (
        <>
          <Ban className="h-2.5 w-2.5" />
          Cancel
        </>
      )}
    </button>
  );

  const cardContent = (
    <div
      className={
        isCancelled
          ? "relative rounded-sm border-b-4 border-transparent bg-paddock-surface-low opacity-50"
          : "relative rounded-sm border-b-4 border-transparent bg-paddock-surface-low transition-[border-color,background-color] duration-300 ease-out group-hover:border-paddock-accent group-hover:bg-paddock-surface-high"
      }
    >
      {hostAction}
      {f1Images && (
        <div className="relative aspect-[16/7] w-full overflow-hidden rounded-t-sm bg-paddock-surface-highest">
          <Image
            src={f1Images.card}
            alt=""
            fill
            className={isCancelled ? "object-cover grayscale" : "object-cover"}
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
        <h4
          className={
            isCancelled
              ? "mb-1 font-display text-lg font-bold uppercase tracking-tight text-paddock-on-muted line-through"
              : "mb-1 font-display text-lg font-bold uppercase tracking-tight text-paddock-on transition-colors group-hover:text-paddock-soft"
          }
        >
          {race.name.replace(/Grand Prix/i, "GP")}
        </h4>
        <p className="mb-6 font-display text-[10px] uppercase tracking-widest text-paddock-on-muted/40">
          {race.circuit}
        </p>
        <div className="flex min-h-7 items-center justify-between gap-2">
          {isCancelled
            ? footerCancelled()
            : mode === "upcoming"
              ? footerUpcoming()
              : footerPast()}
        </div>
      </div>
    </div>
  );

  if (isCancelled && !isHost) {
    return (
      <div className="block min-h-[44px] cursor-default">{cardContent}</div>
    );
  }

  if (isCancelled && isHost) {
    return (
      <div className="group block min-h-[44px] cursor-default">
        {cardContent}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="group block min-h-[44px] origin-center transition-transform duration-300 ease-out hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100"
    >
      {cardContent}
    </Link>
  );
}
