"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface RoomSettingsDialogProps {
  room: Doc<"rooms">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RoomSettingsDialog({
  room,
  open,
  onOpenChange,
}: RoomSettingsDialogProps) {
  const updateRoom = useMutation(api.mutations.rooms.updateRoom);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [roomName, setRoomName] = useState(room.name || "");
  const [lockoutType, setLockoutType] = useState<
    "before_session" | "before_session_end" | "custom"
  >(
    room.lockoutConfig.type === "before_session"
      ? "before_session"
      : room.lockoutConfig.type === "before_session_end"
        ? "before_session_end"
        : "custom"
  );
  const [lockoutSession, setLockoutSession] = useState<
    "fp1" | "fp2" | "fp3" | "qualifying" | "race"
  >(
    room.lockoutConfig.type === "before_session" ||
      room.lockoutConfig.type === "before_session_end"
      ? room.lockoutConfig.session
      : "qualifying"
  );

  // Reset session if it's invalid for the current lockout type
  useEffect(() => {
    if (lockoutType === "before_session_end" && lockoutSession === "race") {
      setLockoutSession("qualifying");
    }
  }, [lockoutType, lockoutSession]);
  const [customHours, setCustomHours] = useState(
    room.lockoutConfig.type === "custom"
      ? room.lockoutConfig.hoursBeforeRace.toString()
      : "1"
  );

  // Scoring config state
  const [positionPoints, setPositionPoints] = useState<string>(
    room.scoringConfig.positionPoints.join(", ")
  );
  const [fastestLapPoints, setFastestLapPoints] = useState(
    room.scoringConfig.fastestLapPoints.toString()
  );
  const [polePositionPoints, setPolePositionPoints] = useState(
    room.scoringConfig.polePositionPoints.toString()
  );
  const [dnfPenalty, setDnfPenalty] = useState(
    room.scoringConfig.dnfPenalty.toString()
  );

  // Reset form when room changes
  useEffect(() => {
    setRoomName(room.name || "");
    setLockoutType(
      room.lockoutConfig.type === "before_session"
        ? "before_session"
        : room.lockoutConfig.type === "before_session_end"
          ? "before_session_end"
          : "custom"
    );
    if (
      room.lockoutConfig.type === "before_session" ||
      room.lockoutConfig.type === "before_session_end"
    ) {
      setLockoutSession(room.lockoutConfig.session);
    } else {
      setCustomHours(room.lockoutConfig.hoursBeforeRace.toString());
    }
    setPositionPoints(room.scoringConfig.positionPoints.join(", "));
    setFastestLapPoints(room.scoringConfig.fastestLapPoints.toString());
    setPolePositionPoints(room.scoringConfig.polePositionPoints.toString());
    setDnfPenalty(room.scoringConfig.dnfPenalty.toString());
  }, [room]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Parse position points
      const parsedPositionPoints = positionPoints
        .split(",")
        .map((p) => parseFloat(p.trim()))
        .filter((p) => !isNaN(p));

      if (parsedPositionPoints.length === 0) {
        toast.error("Position points must include at least one value");
        setIsSaving(false);
        return;
      }

      // Build lockout config
      let lockoutConfig;
      if (lockoutType === "before_session") {
        lockoutConfig = {
          type: "before_session" as const,
          session: lockoutSession,
        };
      } else if (lockoutType === "before_session_end") {
        lockoutConfig = {
          type: "before_session_end" as const,
          session: lockoutSession as "fp1" | "fp2" | "fp3" | "qualifying",
        };
      } else {
        const hours = parseInt(customHours);
        if (isNaN(hours) || hours < 1) {
          toast.error("Custom hours must be at least 1");
          setIsSaving(false);
          return;
        }
        lockoutConfig = {
          type: "custom" as const,
          hoursBeforeRace: hours,
        };
      }

      // Build scoring config
      const scoringConfig = {
        positionPoints: parsedPositionPoints,
        fastestLapPoints: parseFloat(fastestLapPoints) || 0,
        polePositionPoints: parseFloat(polePositionPoints) || 0,
        dnfPenalty: parseFloat(dnfPenalty) || 0,
      };

      await updateRoom({
        roomId: room._id,
        name: roomName.trim() || undefined,
        lockoutConfig,
        scoringConfig,
      });

      toast.success("Room settings updated successfully!");
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating room:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update room settings"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Room Settings</DialogTitle>
          <DialogDescription>
            Update your room configuration. Changes apply to all future races.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <FieldSet>
            <FieldLegend>Room Information</FieldLegend>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="room-name">Room Name</FieldLabel>
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
              Choose when predictions should lock for each race. This applies to
              all races in the season.
            </FieldDescription>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="lockout-type">
                  When should predictions lock?
                </FieldLabel>
                <Select
                  value={lockoutType}
                  onValueChange={(value) =>
                    setLockoutType(
                      value as
                        | "before_session"
                        | "before_session_end"
                        | "custom"
                    )
                  }
                >
                  <SelectTrigger id="lockout-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="before_session">
                      Before a session starts
                    </SelectItem>
                    <SelectItem value="before_session_end">
                      Before a session ends
                    </SelectItem>
                    <SelectItem value="custom">Custom time</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              {(lockoutType === "before_session" ||
                lockoutType === "before_session_end") && (
                <Field>
                  <FieldLabel htmlFor="lockout-session">
                    Which session?
                  </FieldLabel>
                  <Select
                    value={lockoutSession}
                    onValueChange={(value) =>
                      setLockoutSession(
                        value as "fp1" | "fp2" | "fp3" | "qualifying" | "race"
                      )
                    }
                  >
                    <SelectTrigger id="lockout-session">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {lockoutType === "before_session" && (
                        <>
                          <SelectItem value="fp1">Before FP1</SelectItem>
                          <SelectItem value="fp2">Before FP2</SelectItem>
                          <SelectItem value="fp3">Before FP3</SelectItem>
                          <SelectItem value="qualifying">
                            Before Qualifying
                          </SelectItem>
                          <SelectItem value="race">Before Race</SelectItem>
                        </>
                      )}
                      {lockoutType === "before_session_end" && (
                        <>
                          <SelectItem value="fp1">Before FP1 ends</SelectItem>
                          <SelectItem value="fp2">Before FP2 ends</SelectItem>
                          <SelectItem value="fp3">Before FP3 ends</SelectItem>
                          <SelectItem value="qualifying">
                            Before Qualifying ends
                          </SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    Predictions will lock{" "}
                    {lockoutType === "before_session" ? "when" : "before"} this
                    session{" "}
                    {lockoutType === "before_session" ? "starts" : "ends"} for
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
              Points awarded for correct predictions. This applies to all races
              in the season.
            </FieldDescription>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="position-points">
                  Position Points (comma-separated)
                </FieldLabel>
                <Input
                  id="position-points"
                  placeholder="25, 18, 15, 12, 10, 8, 6, 4, 2, 1"
                  value={positionPoints}
                  onChange={(e) => setPositionPoints(e.target.value)}
                />
                <FieldDescription>
                  Points for each position (1st, 2nd, 3rd, etc.). Enter
                  comma-separated values.
                </FieldDescription>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="fastest-lap-points">
                    Fastest Lap Points
                  </FieldLabel>
                  <Input
                    id="fastest-lap-points"
                    type="number"
                    value={fastestLapPoints}
                    onChange={(e) => setFastestLapPoints(e.target.value)}
                  />
                  <FieldDescription>
                    Bonus points for correctly predicting fastest lap.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="pole-position-points">
                    Pole Position Points
                  </FieldLabel>
                  <Input
                    id="pole-position-points"
                    type="number"
                    value={polePositionPoints}
                    onChange={(e) => setPolePositionPoints(e.target.value)}
                  />
                  <FieldDescription>
                    Bonus points for correctly predicting pole position.
                  </FieldDescription>
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="dnf-penalty">DNF Penalty</FieldLabel>
                <Input
                  id="dnf-penalty"
                  type="number"
                  value={dnfPenalty}
                  onChange={(e) => setDnfPenalty(e.target.value)}
                />
                <FieldDescription>
                  Negative points for each incorrect DNF prediction.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldSet>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
