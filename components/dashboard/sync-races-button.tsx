"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const MIN_YEAR = 1950;
const MAX_YEAR = 2030;

const YEARS = Array.from(
  { length: MAX_YEAR - MIN_YEAR + 1 },
  (_, i) => MIN_YEAR + i
).reverse();

export function SyncRacesButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(() =>
    new Date().getFullYear()
  );
  const syncSeason = useAction(api.actions.openf1.syncSeasonFromOpenF1);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncSeason({ year: selectedYear });
      toast.success(
        `Successfully synced ${result.racesSynced} races for ${selectedYear}!`
      );
      setOpen(false);
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={isSyncing}>
          {isSyncing ? "Syncing..." : "Sync Races"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Season</label>
            <Select
              value={selectedYear.toString()}
              onValueChange={(v) => setSelectedYear(parseInt(v, 10))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleSync}
            disabled={isSyncing}
            className="w-full"
            size="sm"
          >
            {isSyncing ? "Syncing..." : `Sync ${selectedYear} Season`}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
