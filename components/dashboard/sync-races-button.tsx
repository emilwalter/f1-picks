"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
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
  const syncSeason = useAction(api.actions.f1Connect.syncSeasonFromF1Connect);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncSeason({ year: selectedYear });
      toast.success(`Synced ${result.racesSynced} races for ${selectedYear}!`);
      setOpen(false);
    } catch (error) {
      console.error("Error syncing races:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to sync races from F1 Connect API"
      );
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={isSyncing}
          className="rounded-sm bg-paddock-surface-high px-3 py-2 font-display text-[10px] font-bold uppercase tracking-widest text-paddock-on transition-colors hover:bg-paddock-surface-highest disabled:opacity-50"
        >
          {isSyncing ? "Syncing..." : "Sync Races"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 bg-paddock-surface-low" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted">
              Season
            </label>
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
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            className="w-full rounded-sm bg-paddock-accent py-2.5 font-display text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-paddock-accent/90 disabled:opacity-50"
          >
            {isSyncing ? "Syncing..." : `Sync ${selectedYear} Season`}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
