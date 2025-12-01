"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
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

export default function CreateRoomPage() {
  const router = useRouter();
  const createRoom = useMutation(api.mutations.rooms.createRoom);

  // Get 2025 season (current F1 season)
  const currentSeason = useQuery(api.queries.seasons.getSeasonByYear, {
    year: 2025,
  });

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

    if (!currentSeason) {
      toast.error("Season not found. Please sync races first.");
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
        seasonId: currentSeason._id,
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

  if (currentSeason === undefined) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-zinc-600 dark:text-zinc-400">
          Loading...
        </div>
      </div>
    );
  }

  if (!currentSeason) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">
              No Season Found
            </h2>
            <p className="mb-4 text-zinc-600 dark:text-zinc-400">
              Please sync races first to create a room for the{" "}
              {new Date().getFullYear()} season.
            </p>
            <Link href="/">
              <Button>Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
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
                    Create a room for the {currentSeason.year} Formula 1 season.
                    Participants will make predictions for each race throughout
                    the season.
                  </FieldDescription>
                  <FieldGroup>
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
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? "Creating..." : "Create Room"}
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
