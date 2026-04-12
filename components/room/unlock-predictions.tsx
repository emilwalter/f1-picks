"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { LockOpen, Lock, Timer } from "lucide-react";
import { Countdown } from "@/components/ui/countdown";
import type { Doc } from "@/convex/_generated/dataModel";

const DURATION_OPTIONS = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "60 min", value: 60 },
] as const;

interface UnlockPredictionsProps {
  room: Doc<"rooms">;
  race: Doc<"races">;
  lockoutInfo: {
    locked: boolean;
    unlockOverride: { expiresAt: number; remainingMs: number } | null;
  } | null;
}

export function UnlockPredictions({
  room,
  race,
  lockoutInfo,
}: UnlockPredictionsProps) {
  const [selectedDuration, setSelectedDuration] = useState(15);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isLocking, setIsLocking] = useState(false);

  const unlockPredictions = useMutation(api.mutations.rooms.unlockPredictions);
  const lockPredictions = useMutation(api.mutations.rooms.lockPredictions);

  const hasResults =
    Array.isArray(race.officialResults?.positions) &&
    race.officialResults.positions.length > 0;

  if (hasResults) return null;

  const overrideActive = lockoutInfo?.unlockOverride != null;

  const handleUnlock = async () => {
    setIsUnlocking(true);
    try {
      await unlockPredictions({
        roomId: room._id,
        raceId: race._id,
        durationMinutes: selectedDuration,
      });
      toast.success(`Predictions unlocked for ${selectedDuration} minutes`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to unlock predictions"
      );
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleLock = async () => {
    setIsLocking(true);
    try {
      await lockPredictions({ roomId: room._id });
      toast.success("Predictions locked");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to lock predictions"
      );
    } finally {
      setIsLocking(false);
    }
  };

  if (overrideActive) {
    return (
      <div className="rounded-sm border border-paddock-cyan/20 bg-paddock-cyan/[0.06] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-cyan">
            Predictions Unlocked
          </h4>
          <div className="flex items-center gap-1.5">
            <Timer className="h-2.5 w-2.5 text-paddock-cyan" />
            <Countdown
              targetTime={lockoutInfo!.unlockOverride!.expiresAt}
              expiredLabel="Expired"
              timeClassName="font-display text-[11px] font-bold tabular-nums text-paddock-cyan"
              expiredClassName="font-display text-[10px] font-bold text-paddock-accent"
            />
          </div>
        </div>
        <p className="mb-3 text-[11px] leading-snug text-paddock-on-muted">
          Participants can submit or update predictions until the timer expires.
        </p>
        <button
          type="button"
          onClick={handleLock}
          disabled={isLocking}
          className="flex w-full items-center justify-center gap-2 rounded-sm bg-paddock-surface-high py-2 font-display text-[10px] font-bold uppercase tracking-widest text-paddock-on transition-colors hover:bg-paddock-surface-highest disabled:opacity-50"
        >
          <Lock className="h-3 w-3" />
          {isLocking ? "Locking..." : "Lock Now"}
        </button>
      </div>
    );
  }

  const wouldNeedUnlock = lockoutInfo?.locked;
  if (!wouldNeedUnlock) return null;

  return (
    <div className="rounded-sm bg-paddock-surface-low p-4">
      <h4 className="mb-2 font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted">
        Unlock Predictions
      </h4>
      <p className="mb-3 text-[11px] leading-snug text-paddock-on-muted">
        Temporarily re-open submissions for this race.
      </p>

      <div className="mb-3 flex gap-1.5">
        {DURATION_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setSelectedDuration(opt.value)}
            className={cn(
              "flex-1 rounded-sm py-1.5 font-display text-[9px] font-bold uppercase tracking-widest transition-colors",
              selectedDuration === opt.value
                ? "bg-paddock-cyan/20 text-paddock-cyan ring-1 ring-paddock-cyan/40"
                : "bg-paddock-surface-high text-paddock-on-muted hover:text-paddock-on"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleUnlock}
        disabled={isUnlocking}
        className="flex w-full items-center justify-center gap-2 rounded-sm bg-paddock-cyan/15 py-2 font-display text-[10px] font-bold uppercase tracking-widest text-paddock-cyan transition-colors hover:bg-paddock-cyan/25 disabled:opacity-50"
      >
        <LockOpen className="h-3 w-3" />
        {isUnlocking ? "Unlocking..." : "Unlock Predictions"}
      </button>
    </div>
  );
}
