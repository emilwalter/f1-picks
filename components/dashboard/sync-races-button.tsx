"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function SyncRacesButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const syncSeason = useAction(api.actions.openf1.syncSeasonFromOpenF1);

  const handleSync = async () => {
    const currentYear = 2025; // Use 2025 season

    setIsSyncing(true);
    try {
      const result = await syncSeason({ year: currentYear });
      toast.success(
        `Successfully synced ${result.racesSynced} races for ${currentYear}!`
      );
    } catch (error) {
      console.error("Error syncing races:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to sync races from F1 API"
      );
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button
      onClick={handleSync}
      disabled={isSyncing}
      variant="outline"
      size="sm"
    >
      {isSyncing ? "Syncing..." : "Sync Races"}
    </Button>
  );
}
