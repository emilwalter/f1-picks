"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import type { Doc, Id } from "@/convex/_generated/dataModel";

interface SyncRaceResultsProps {
  room: Doc<"rooms">;
  race: Doc<"races">;
  currentUser: Doc<"users"> | null;
}

export function SyncRaceResults({
  room,
  race,
  currentUser,
}: SyncRaceResultsProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const syncRaceResults = useAction(
    api.actions.raceSync.syncRaceResultsAndScore,
  );

  const isHost = currentUser && currentUser._id === room.hostId;
  const hasResults = !!race.officialResults;
  const isPast = race.date < Date.now();

  // Only show to hosts for past races
  if (!isHost || !isPast) {
    return null;
  }

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncRaceResults({ raceId: race._id });
      if (result.success) {
        toast.success(
          `Successfully synced results and scored ${result.roomsScored} rooms!`,
        );
      } else {
        toast.error(result.message || "Failed to sync race results");
      }
    } catch (error) {
      console.error("Error syncing race results:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to sync race results",
      );
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Race Results</CardTitle>
          {hasResults ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Synced
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              Not Synced
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasResults ? (
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            <p>Race results have been synced and scoring has been applied.</p>
            {race.officialResults && (
              <p className="mt-2">
                {race.officialResults.positions.length} drivers finished the
                race.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              This race has completed but results haven't been synced yet. Click
              the button below to sync results from the F1 API and automatically
              score all predictions.
            </p>
            <Button
              onClick={handleSync}
              disabled={isSyncing}
              className="w-full"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync Results & Score Predictions
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
