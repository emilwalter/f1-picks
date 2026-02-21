"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { Authenticated } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
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
  const syncSeason = useAction(api.actions.openf1.syncSeasonFromOpenF1);

  const seasons = useQuery(api.queries.seasons.listSeasons);
  const [selectedYear, setSelectedYear] = useState<number>(() =>
    new Date().getFullYear()
  );
  const [isSyncing, setIsSyncing] = useState(false);

  const selectedSeason = seasons?.find((s) => s.year === selectedYear);
  const needsSync = Boolean(selectedYear && !selectedSeason);

  // Auto-sync when user selects a season that isn't in the DB yet
  useEffect(() => {
    if (
      !needsSync ||
      !selectedYear ||
      isSyncing ||
      seasons === undefined // Wait for seasons to load before syncing
    )
      return;

    let cancelled = false;
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
  }, [selectedYear, needsSync, seasons]); // eslint-disable-line react-hooks/exhaustive-deps -- syncSeason is stable

  const [roomName, setRoomName] = useState("");
  const [lockoutType, setLockoutType] = useState<"before_session" | "custom">(
    "before_session"
  );
  const [lockoutSession, setLockoutSession] = useState<"qualifying" | "race">(
    "qualifying"
  );
  const [customHours, setCustomHours] = useState("1");
  const [isCreating, setIsCreating] = useState(false);

  // Default scoring config (F1 standard)
  const defaultScoringConfig = {
    positionPoints: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
    fastestLapPoints: 1,
    polePositionPoints: 2,
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
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-zinc-600 dark:text-zinc-400">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Create Prediction Room</CardTitle>
        </CardHeader>
        <CardContent>
          <Authenticated>
            <form onSubmit={handleCreate}>
              <FieldGroup>
                <FieldSet>
                  <FieldLegend>Room Information</FieldLegend>
                  <FieldDescription>
                    Create a room for an F1 season. Participants will make
                    predictions for each race throughout the season.
                  </FieldDescription>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="season">Season</FieldLabel>
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
                            const season = seasons?.find(
                              (s) => s.year === year
                            );
                            return (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                                {season ? ` (${season.totalRaces} races)` : ""}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FieldDescription>
                        {needsSync && isSyncing
                          ? `Fetching ${selectedYear} season from F1 API…`
                          : "Choose which F1 season this room is for."}
                      </FieldDescription>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="room-name">
                        Room Name (Optional)
                      </FieldLabel>
                      <Input
                        id="room-name"
                        placeholder="e.g., Friends F1 League"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                      />
                      <FieldDescription>
                        Give your room a name to help identify it.
                      </FieldDescription>
                    </Field>
                  </FieldGroup>
                </FieldSet>

                <FieldSet>
                  <FieldLegend>Lockout Configuration</FieldLegend>
                  <FieldDescription>
                    Choose when predictions should lock for each race. This
                    applies to all races in the season.
                  </FieldDescription>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="lockout-type">
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
                        <FieldLabel htmlFor="lockout-session">
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
                        <FieldDescription>
                          Predictions will lock when this session starts for
                          each race.
                        </FieldDescription>
                      </Field>
                    )}

                    {lockoutType === "custom" && (
                      <Field>
                        <FieldLabel htmlFor="custom-hours">
                          Hours before race start
                        </FieldLabel>
                        <Input
                          id="custom-hours"
                          type="number"
                          min="1"
                          value={customHours}
                          onChange={(e) => setCustomHours(e.target.value)}
                        />
                        <FieldDescription>
                          Predictions will lock this many hours before each race
                          starts.
                        </FieldDescription>
                      </Field>
                    )}
                  </FieldGroup>
                </FieldSet>

                <FieldSet>
                  <FieldLegend>Scoring Configuration</FieldLegend>
                  <FieldDescription>
                    Points awarded for correct predictions. This applies to all
                    races in the season.
                  </FieldDescription>
                  <FieldGroup>
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                        <div>
                          Position points: F1 standard (25, 18, 15, 12, 10, 8,
                          6, 4, 2, 1)
                        </div>
                        <div>Fastest lap: +1 point</div>
                        <div>Pole position: +2 points</div>
                        <div>
                          DNF penalty: -1 point per incorrect prediction
                        </div>
                      </div>
                    </div>
                  </FieldGroup>
                </FieldSet>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isCreating || (needsSync && isSyncing)}
                  >
                    {isCreating
                      ? "Creating..."
                      : needsSync && isSyncing
                        ? "Loading season…"
                        : "Create Room"}
                  </Button>
                </div>
              </FieldGroup>
            </form>
          </Authenticated>
        </CardContent>
      </Card>
    </div>
  );
}
