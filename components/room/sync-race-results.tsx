"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { RefreshCw, CheckCircle2 } from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel";

interface SyncRaceResultsProps {
  room: Doc<"rooms">;
  race: Doc<"races">;
  currentUser: Doc<"users"> | null;
  compact?: boolean;
}

export function SyncRaceResults({
  room,
  race,
  currentUser,
  compact = false,
}: SyncRaceResultsProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const syncRaceResults = useAction(
    api.actions.raceSync.syncRaceResultsAndScore
  );

  const isHost = currentUser && currentUser._id === room.hostId;
  /** Standings rows exist — not just a stale officialResults object with empty positions */
  const hasResults =
    Array.isArray(race.officialResults?.positions) &&
    race.officialResults.positions.length > 0;
  const isPast = race.date < Date.now();

  if (!isHost) return null;

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncRaceResults({ raceId: race._id });
      if (result.success) {
        toast.success(result.message || "Synced results and applied scoring.");
      } else {
        toast.error(result.message || "Failed to sync race results");
      }
    } catch (error) {
      console.error("Error syncing race results:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to sync race results"
      );
    } finally {
      setIsSyncing(false);
    }
  };

  if (compact) {
    return (
      <div className="rounded-sm bg-paddock-surface-low p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted">
            Host Tools
          </h4>
          {hasResults ? (
            <span className="flex items-center gap-1 font-display text-[9px] font-semibold uppercase tracking-widest text-paddock-cyan">
              <CheckCircle2 className="h-2.5 w-2.5" />
              Synced
            </span>
          ) : (
            <span className="font-display text-[9px] uppercase tracking-widest text-paddock-on-muted/50">
              Not Synced
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={isSyncing}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-sm py-2 font-display text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50",
            hasResults
              ? "bg-paddock-surface-high text-paddock-on hover:bg-paddock-surface-highest"
              : "bg-paddock-surface-high text-paddock-on hover:bg-paddock-surface-highest"
          )}
        >
          <RefreshCw className={cn("h-3 w-3", isSyncing && "animate-spin")} />
          {isSyncing
            ? "Syncing..."
            : hasResults
              ? "Re-sync Results"
              : "Sync & Score"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-sm bg-paddock-surface-low p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-sm font-bold uppercase tracking-wide text-paddock-on">
          Race Results
        </h3>
        {hasResults ? (
          <span className="flex items-center gap-1.5 font-display text-[9px] font-semibold uppercase tracking-widest text-paddock-cyan">
            <CheckCircle2 className="h-3 w-3" />
            Synced
          </span>
        ) : (
          <span className="font-display text-[9px] font-semibold uppercase tracking-widest text-paddock-on-muted">
            Not Synced
          </span>
        )}
      </div>

      <p className="mb-4 text-xs text-paddock-on-muted">
        {hasResults
          ? "Race results have been synced and scoring applied."
          : isPast
            ? "Sync race results from the F1 Connect API and score all predictions."
            : "Sync race results and calculate scores. This will update results from the F1 Connect API and recalculate all prediction scores."}
      </p>

      <button
        type="button"
        onClick={handleSync}
        disabled={isSyncing}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-sm py-2.5 font-display text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50",
          hasResults
            ? "bg-paddock-surface-high text-paddock-on hover:bg-paddock-surface-highest"
            : "bg-paddock-accent text-white hover:bg-paddock-accent/90"
        )}
      >
        <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} />
        {isSyncing
          ? "Syncing..."
          : hasResults
            ? "Re-sync & Recalculate"
            : "Sync Results & Score Predictions"}
      </button>
    </div>
  );
}
