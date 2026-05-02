"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { Authenticated } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import Link from "next/link";

const MIN_YEAR = 2020;

function getAvailableYears() {
  const maxYear = new Date().getFullYear();
  return Array.from(
    { length: maxYear - MIN_YEAR + 1 },
    (_, i) => MIN_YEAR + i
  ).reverse();
}

export default function CreateRoomPage() {
  const router = useRouter();
  const createRoom = useMutation(api.mutations.rooms.createRoom);
  const syncSeason = useAction(api.actions.f1Connect.syncSeasonFromF1Connect);

  const seasons = useQuery(api.queries.seasons.listSeasons);
  const [selectedYear, setSelectedYear] = useState<number>(() =>
    new Date().getFullYear()
  );
  const [isSyncing, setIsSyncing] = useState(false);

  const selectedSeason = seasons?.find((s) => s.year === selectedYear);
  const needsSync = Boolean(selectedYear && !selectedSeason);

  useEffect(() => {
    if (!needsSync || !selectedYear || isSyncing || seasons === undefined)
      return;

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- need to flag in-flight sync immediately to keep the early-return guard above accurate; cleared inside the .finally() callback
    setIsSyncing(true);

    syncSeason({ year: selectedYear })
      .then(() => {
        if (!cancelled) {
          toast.success(`${selectedYear} season ready.`);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Error syncing season:", error);
          toast.error(
            error instanceof Error ? error.message : "Failed to load season"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsSyncing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedYear, needsSync, seasons]); // eslint-disable-line react-hooks/exhaustive-deps

  const [roomName, setRoomName] = useState("");
  const [lockoutType, setLockoutType] = useState<"before_session" | "custom">(
    "before_session"
  );
  const [lockoutSession, setLockoutSession] = useState<"qualifying" | "race">(
    "qualifying"
  );
  const [customHours, setCustomHours] = useState("1");
  const [isCreating, setIsCreating] = useState(false);

  const defaultScoringConfig = {
    positionPoints: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
    fastestLapPoints: 1,
    polePositionPoints: 2,
    dnfCorrectMultiplier: 0,
    dnfPenalty: 1,
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSeason) {
      toast.error("Season is still loading. Please wait a moment.");
      return;
    }

    setIsCreating(true);
    try {
      let lockoutConfig;

      if (lockoutType === "before_session") {
        lockoutConfig = {
          type: "before_session" as const,
          session: lockoutSession,
        };
      } else {
        lockoutConfig = {
          type: "custom" as const,
          hoursBeforeRace: parseInt(customHours) || 1,
        };
      }

      const roomId = await createRoom({
        seasonId: selectedSeason._id,
        name: roomName.trim() || undefined,
        lockoutConfig,
        scoringConfig: defaultScoringConfig,
      });

      toast.success("Room created successfully!");
      router.push(`/rooms/${roomId}`);
    } catch (error) {
      console.error("Error creating room:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create room"
      );
    } finally {
      setIsCreating(false);
    }
  };

  if (seasons === undefined) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center font-display text-sm uppercase tracking-widest text-paddock-on-muted">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <Link
        href="/"
        className="mb-6 inline-block font-display text-[11px] font-semibold uppercase tracking-widest text-paddock-on-muted transition-colors hover:text-paddock-cyan"
      >
        ← Dashboard
      </Link>

      <div className="mb-8">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.25em] text-paddock-accent">
          New League
        </p>
        <h1 className="mt-1 font-display text-3xl font-black italic uppercase tracking-tight text-paddock-on">
          Create Room
        </h1>
        <p className="mt-2 text-sm text-paddock-on-muted">
          Create a prediction room for an F1 season. Invite friends with the
          join code after creation.
        </p>
      </div>

      <Authenticated>
        <form onSubmit={handleCreate} className="space-y-6">
          {/* Season & Name */}
          <div className="rounded-sm bg-paddock-surface-low p-5 space-y-5">
            <h3 className="font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted">
              Room Information
            </h3>

            <FieldGroup>
              <Field>
                <FieldLabel
                  htmlFor="season"
                  className="font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted"
                >
                  Season
                </FieldLabel>
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(v) => setSelectedYear(parseInt(v, 10))}
                  disabled={isSyncing}
                >
                  <SelectTrigger id="season">
                    <SelectValue placeholder="Select season" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableYears().map((year) => {
                      const season = seasons?.find((s) => s.year === year);
                      return (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                          {season ? ` (${season.totalRaces} races)` : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {needsSync && isSyncing && (
                  <FieldDescription className="text-paddock-cyan">
                    Fetching {selectedYear} season from F1 Connect API...
                  </FieldDescription>
                )}
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="room-name"
                  className="font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted"
                >
                  Room Name (Optional)
                </FieldLabel>
                <Input
                  id="room-name"
                  placeholder="e.g., Friends F1 League"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                />
              </Field>
            </FieldGroup>
          </div>

          {/* Lockout Configuration */}
          <div className="rounded-sm bg-paddock-surface-low p-5 space-y-5">
            <h3 className="font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted">
              Lockout Configuration
            </h3>

            <FieldGroup>
              <Field>
                <FieldLabel
                  htmlFor="lockout-type"
                  className="font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted"
                >
                  When should predictions lock?
                </FieldLabel>
                <Select
                  value={lockoutType}
                  onValueChange={(value) =>
                    setLockoutType(value as "before_session" | "custom")
                  }
                >
                  <SelectTrigger id="lockout-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="before_session">
                      Before a session starts
                    </SelectItem>
                    <SelectItem value="custom">Custom time</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              {lockoutType === "before_session" && (
                <Field>
                  <FieldLabel
                    htmlFor="lockout-session"
                    className="font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted"
                  >
                    Which session?
                  </FieldLabel>
                  <Select
                    value={lockoutSession}
                    onValueChange={(value) =>
                      setLockoutSession(value as "qualifying" | "race")
                    }
                  >
                    <SelectTrigger id="lockout-session">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="qualifying">
                        Before Qualifying
                      </SelectItem>
                      <SelectItem value="race">Before Race</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}

              {lockoutType === "custom" && (
                <Field>
                  <FieldLabel
                    htmlFor="custom-hours"
                    className="font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted"
                  >
                    Hours before race start
                  </FieldLabel>
                  <Input
                    id="custom-hours"
                    type="number"
                    min="1"
                    value={customHours}
                    onChange={(e) => setCustomHours(e.target.value)}
                  />
                </Field>
              )}
            </FieldGroup>
          </div>

          {/* Scoring */}
          <div className="rounded-sm bg-paddock-surface-low p-5 space-y-4">
            <h3 className="font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted">
              Scoring Configuration
            </h3>
            <div className="space-y-1.5 text-sm text-paddock-on-muted">
              <div className="flex justify-between">
                <span>Position points</span>
                <span className="font-mono text-paddock-on">
                  25, 18, 15, 12, 10, 8, 6, 4, 2, 1
                </span>
              </div>
              <div className="flex justify-between">
                <span>Fastest lap</span>
                <span className="font-mono text-paddock-on">+1 point</span>
              </div>
              <div className="flex justify-between">
                <span>Pole position</span>
                <span className="font-mono text-paddock-on">+2 points</span>
              </div>
              <div className="flex justify-between">
                <span>DNF multiplier (per correct)</span>
                <span className="font-mono text-paddock-on">0 (no bonus)</span>
              </div>
              <div className="flex justify-between">
                <span>DNF miss (each)</span>
                <span className="font-mono text-paddock-accent">-1 point</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={isCreating}
              className="rounded-sm bg-paddock-surface-high px-5 py-2.5 font-display text-[10px] font-bold uppercase tracking-widest text-paddock-on transition-colors hover:bg-paddock-surface-highest disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || (needsSync && isSyncing)}
              className="rounded-sm bg-paddock-accent px-6 py-2.5 font-display text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-paddock-accent/90 disabled:opacity-50"
            >
              {isCreating
                ? "Creating..."
                : needsSync && isSyncing
                  ? "Loading season..."
                  : "Create Room"}
            </button>
          </div>
        </form>
      </Authenticated>
    </div>
  );
}
