"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import type { Doc, Id } from "@/convex/_generated/dataModel";

interface SyncAllRacesButtonProps {
  races: Doc<"races">[];
}

export function SyncAllRacesButton({ races }: SyncAllRacesButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const syncRaceResults = useAction(
    api.actions.raceSync.syncRaceResultsAndScore,
  );

  // Only show races that have completed (past races)
  const pastRaces = races.filter((race) => race.date < Date.now());

  if (pastRaces.length === 0) {
    return null;
  }

  const handleSyncAll = async () => {
    setIsSyncing(true);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      // Sync each race sequentially to avoid overwhelming the API
      for (const race of pastRaces) {
        try {
          // Check if race has actually completed (race date has passed)
          const now = Date.now();

          // Skip races that haven't started yet
          if (now < race.date) {
            continue;
          }

          const result = await syncRaceResults({ raceId: race._id });
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
            const errorMsg = result.message || "Unknown error";
            errors.push(`${race.name}: ${errorMsg}`);
            console.error(`Failed to sync race ${race.name}:`, errorMsg);

            // If it's a "Not Found" error, it might just mean the race hasn't happened yet
            // or data isn't available - don't treat it as a critical error
            if (
              errorMsg.includes("Not Found") ||
              errorMsg.includes("No race session found")
            ) {
              // This is expected for races that haven't happened yet or don't have data
              console.log(
                `Race ${race.name} not found in API - may not have happened yet`,
              );
            }
          }
          // Small delay between races
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          errorCount++;
          const errorMsg =
            error instanceof Error ? error.message : "Unknown error";
          errors.push(`${race.name}: ${errorMsg}`);
          console.error(`Error syncing race ${race._id}:`, error);
        }
      }

      if (successCount === 0 && errorCount === 0) {
        toast.info(
          "No races ready to sync yet. All races have already been synced or haven't started yet.",
        );
      } else if (errorCount === 0) {
        toast.success(
          `Successfully synced ${successCount} race${successCount !== 1 ? "s" : ""}!`,
        );
      } else {
        // Show summary, but don't show all errors (could be too many)
        const notFoundErrors = errors.filter(
          (e) => e.includes("Not Found") || e.includes("No race session"),
        );
        const otherErrors = errors.filter(
          (e) => !e.includes("Not Found") && !e.includes("No race session"),
        );

        let message = `Synced ${successCount} race${successCount !== 1 ? "s" : ""}`;
        if (otherErrors.length > 0) {
          message += `, ${otherErrors.length} error${otherErrors.length !== 1 ? "s" : ""}`;
        }
        if (notFoundErrors.length > 0) {
          message += `, ${notFoundErrors.length} race${notFoundErrors.length !== 1 ? "s" : ""} not available in API yet`;
        }

        toast.warning(message);
      }
    } catch (error) {
      console.error("Error syncing races:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to sync races",
      );
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button
      onClick={handleSyncAll}
      disabled={isSyncing}
      variant="outline"
      size="sm"
    >
      {isSyncing ? (
        <>
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          Syncing...
        </>
      ) : (
        <>
          <RefreshCw className="mr-2 h-4 w-4" />
          Sync All Races
        </>
      )}
    </Button>
  );
}
