"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel";

interface SyncAllRacesButtonProps {
  races: Doc<"races">[];
}

export function SyncAllRacesButton({ races }: SyncAllRacesButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [renderTime] = useState(() => Date.now());
  const syncRaceResults = useAction(
    api.actions.raceSync.syncRaceResultsAndScore
  );

  const pastRaces = races.filter((race) => race.date < renderTime);
  if (pastRaces.length === 0) return null;

  const handleSyncAll = async () => {
    setIsSyncing(true);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      for (const race of pastRaces) {
        try {
          const now = Date.now();
          if (now < race.date) continue;

          const result = await syncRaceResults({ raceId: race._id });
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
            const errorMsg = result.message || "Unknown error";
            errors.push(`${race.name}: ${errorMsg}`);
          }
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          errorCount++;
          const errorMsg =
            error instanceof Error ? error.message : "Unknown error";
          errors.push(`${race.name}: ${errorMsg}`);
        }
      }

      if (successCount === 0 && errorCount === 0) {
        toast.info("No races ready to sync.");
      } else if (errorCount === 0) {
        toast.success(
          `Synced ${successCount} race${successCount !== 1 ? "s" : ""}!`
        );
      } else {
        const notFoundErrors = errors.filter(
          (e) => e.includes("Not Found") || e.includes("No race session")
        );
        const otherErrors = errors.filter(
          (e) => !e.includes("Not Found") && !e.includes("No race session")
        );

        let message = `Synced ${successCount} race${successCount !== 1 ? "s" : ""}`;
        if (otherErrors.length > 0)
          message += `, ${otherErrors.length} error${otherErrors.length !== 1 ? "s" : ""}`;
        if (notFoundErrors.length > 0)
          message += `, ${notFoundErrors.length} not available yet`;

        toast.warning(message);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to sync races"
      );
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSyncAll}
      disabled={isSyncing}
      className="flex w-full items-center justify-center gap-2 rounded-sm bg-paddock-surface-high py-2.5 font-display text-[10px] font-bold uppercase tracking-widest text-paddock-on transition-colors hover:bg-paddock-surface-highest disabled:opacity-50"
    >
      <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} />
      {isSyncing ? "Syncing..." : "Sync All Races"}
    </button>
  );
}
