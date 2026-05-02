"use client";

import { useState, useEffect } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Image from "next/image";
import type { Doc } from "@/convex/_generated/dataModel";
import { getDriverImageUrl } from "@/lib/f1-images";
import { DriverCombobox } from "@/components/room/driver-combobox";
import { SyncRaceResults } from "@/components/room/sync-race-results";
import { UnlockPredictions } from "@/components/room/unlock-predictions";
import { X } from "lucide-react";

interface Driver {
  driverNumber: number;
  name: string;
  teamName: string;
  teamLogo?: string;
  countryCode: string;
}

interface PredictionFormProps {
  room: Doc<"rooms">;
  race: Doc<"races">;
  seasonYear: number;
  currentPrediction: Doc<"predictions"> | null | undefined;
  isLocked?: boolean;
  currentUser?: Doc<"users"> | null;
  /** When the parent already loads drivers (e.g. locked race + summary), skip duplicate fetch */
  prefetchedDrivers?: Driver[] | null;
  lockoutInfo?: {
    locked: boolean;
    unlockOverride: { expiresAt: number; remainingMs: number } | null;
  } | null;
}

export function PredictionForm({
  room,
  race,
  seasonYear,
  currentPrediction,
  isLocked: isLockedProp,
  currentUser,
  prefetchedDrivers,
  lockoutInfo,
}: PredictionFormProps) {
  const submitPrediction = useMutation(
    api.mutations.predictions.submitPrediction
  );
  const getDriversForRace = useAction(api.actions.f1Connect.getDriversForRace);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [renderTime] = useState(() => Date.now());
  const [fetchedDrivers, setFetchedDrivers] = useState<Driver[] | null>(null);

  const drivers: Driver[] | null =
    prefetchedDrivers !== undefined && prefetchedDrivers !== null
      ? prefetchedDrivers
      : fetchedDrivers;
  const isLoadingDrivers = drivers === null;

  useEffect(() => {
    if (prefetchedDrivers !== undefined) return;
    let cancelled = false;
    const fetchDrivers = async () => {
      try {
        const driversData = await getDriversForRace({ year: seasonYear });
        if (!cancelled) setFetchedDrivers(driversData);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch drivers:", error);
          toast.error("Failed to load drivers. Please try again.");
          setFetchedDrivers([]);
        }
      }
    };
    fetchDrivers();
    return () => {
      cancelled = true;
    };
  }, [seasonYear, getDriversForRace, prefetchedDrivers]);

  const [predictedPositions, setPredictedPositions] = useState<
    Array<{ position: number; driverNumber: number }>
  >(
    currentPrediction?.predictedPositions ||
      Array.from({ length: 10 }, (_, i) => ({
        position: i + 1,
        driverNumber: 0,
      }))
  );
  const [polePositionDriverId, setPolePositionDriverId] = useState<
    number | undefined
  >(currentPrediction?.polePositionDriverId);
  const [fastestLapDriverId, setFastestLapDriverId] = useState<
    number | undefined
  >(currentPrediction?.fastestLapDriverId);
  const [dnfDriverIds, setDnfDriverIds] = useState<number[]>(
    currentPrediction?.dnfDriverIds || []
  );
  const [syncedPrediction, setSyncedPrediction] = useState(currentPrediction);

  if (currentPrediction !== syncedPrediction) {
    setSyncedPrediction(currentPrediction);
    if (currentPrediction) {
      setPredictedPositions(
        currentPrediction.predictedPositions.length > 0
          ? currentPrediction.predictedPositions
          : Array.from({ length: 10 }, (_, i) => ({
              position: i + 1,
              driverNumber: 0,
            }))
      );
      setPolePositionDriverId(currentPrediction.polePositionDriverId);
      setFastestLapDriverId(currentPrediction.fastestLapDriverId);
      setDnfDriverIds(currentPrediction.dnfDriverIds);
    }
  }

  const handlePositionChange = (position: number, driverNumber: number) => {
    setPredictedPositions((prev) => {
      const newPositions = [...prev];
      const index = newPositions.findIndex((p) => p.position === position);
      if (index >= 0) {
        newPositions[index] = { position, driverNumber };
      }
      return newPositions;
    });
  };

  const toggleDnf = (driverNumber: number) => {
    setDnfDriverIds((prev) =>
      prev.includes(driverNumber)
        ? prev.filter((id) => id !== driverNumber)
        : [...prev, driverNumber]
    );
  };

  const isPast = race.date < renderTime;
  const isLocked =
    isLockedProp !== undefined
      ? isLockedProp
      : room.status !== "open" || isPast;

  const handleSubmit = async () => {
    if (isLocked) {
      toast.error(
        isPast
          ? "Cannot submit predictions for past races"
          : "This room is not accepting predictions"
      );
      return;
    }

    const missingPositions = predictedPositions.filter(
      (p) => p.driverNumber === 0
    );
    if (missingPositions.length > 0) {
      toast.error(
        `Please select drivers for positions ${missingPositions.map((p) => p.position).join(", ")}`
      );
      return;
    }

    const driverNumbers = predictedPositions.map((p) => p.driverNumber);
    const duplicates = driverNumbers.filter(
      (num, index) => driverNumbers.indexOf(num) !== index
    );
    if (duplicates.length > 0) {
      toast.error("Each driver can only be selected once");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitPrediction({
        roomId: room._id,
        raceId: race._id,
        prediction: {
          predictedPositions: predictedPositions.map((p) => ({
            position: p.position,
            driverNumber: p.driverNumber,
          })),
          fastestLapDriverId,
          polePositionDriverId,
          dnfDriverIds,
        },
      });
      toast.success(
        currentPrediction
          ? "Prediction updated successfully!"
          : "Prediction submitted successfully!"
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit prediction"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingDrivers) {
    return (
      <div className="rounded-sm bg-paddock-surface-low p-8 text-center font-display text-sm uppercase tracking-widest text-paddock-on-muted">
        Loading drivers...
      </div>
    );
  }

  if (!drivers || drivers.length === 0) {
    return (
      <div className="rounded-sm bg-paddock-surface-low p-8 text-center font-display text-sm uppercase tracking-widest text-paddock-on-muted">
        No drivers available for this race yet. Check back later!
      </div>
    );
  }

  const filledCount = predictedPositions.filter(
    (p) => p.driverNumber !== 0
  ).length;

  const positionPointsTable = room.scoringConfig.positionPoints;
  const ptsForPosition = (position: number) =>
    positionPointsTable[position - 1] ?? 0;
  const polePts = room.scoringConfig.polePositionPoints;
  const fastestPts = room.scoringConfig.fastestLapPoints;
  const dnfMultRate = room.scoringConfig.dnfCorrectMultiplier ?? 0;
  const dnfMissPts = room.scoringConfig.dnfPenalty;

  const getDriverLastName = (driverNumber: number) => {
    const d = drivers.find((d) => d.driverNumber === driverNumber);
    if (!d) return "";
    const parts = d.name.split(" ");
    return parts.length > 1
      ? parts.slice(1).join(" ").toUpperCase()
      : d.name.toUpperCase();
  };

  return (
    <div className="grid gap-6 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:grid-cols-[1fr_320px]">
      {/* Left — Prediction slots */}
      <div className="space-y-6">
        {/* Race Winner (P1) — Hero slot */}
        <div className="rounded-sm bg-paddock-surface-low p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded-sm bg-paddock-accent px-2 py-0.5 font-display text-[10px] font-bold text-white">
                01
              </span>
              <h3 className="font-display text-sm font-bold uppercase tracking-widest text-paddock-on">
                Race Winner
              </h3>
            </div>
            <span className="rounded-full bg-paddock-surface-highest px-2.5 py-0.5 font-display text-[10px] font-semibold tabular-nums text-paddock-on">
              {ptsForPosition(1)} PTS
            </span>
          </div>

          {(() => {
            const pos1 = predictedPositions.find((p) => p.position === 1);
            const selectedDriver = pos1?.driverNumber
              ? drivers.find((d) => d.driverNumber === pos1.driverNumber)
              : null;

            if (selectedDriver) {
              return (
                <div className="flex items-center gap-4 rounded-sm bg-paddock-surface px-4 py-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-sm">
                    <Image
                      src={getDriverImageUrl(
                        selectedDriver.driverNumber,
                        selectedDriver.name,
                        selectedDriver.teamName
                      )}
                      alt={selectedDriver.name}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-display text-[9px] font-semibold uppercase tracking-widest text-paddock-on-muted">
                      {selectedDriver.teamName}
                    </span>
                    <p className="font-display text-lg font-black uppercase tracking-tight text-paddock-on">
                      {getDriverLastName(selectedDriver.driverNumber)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePositionChange(1, 0)}
                    className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-sm text-paddock-on-muted touch-manipulation transition-colors hover:bg-paddock-surface-high hover:text-paddock-on active:bg-paddock-surface-high"
                    aria-label="Clear race winner"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            }

            return (
              <DriverCombobox
                drivers={drivers}
                value={undefined}
                onChange={(driverNumber) =>
                  handlePositionChange(1, driverNumber)
                }
                excludeDriverNumbers={predictedPositions
                  .filter((p) => p.position !== 1)
                  .map((p) => p.driverNumber)
                  .filter((n) => n !== 0)}
                placeholder="Select race winner..."
              />
            );
          })()}
        </div>

        {/* Podium P2 & P3 — stack on narrow phones for comfortable combobox + touch */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[2, 3].map((pos) => {
            const posEntry = predictedPositions.find((p) => p.position === pos);
            const selectedDriver = posEntry?.driverNumber
              ? drivers.find((d) => d.driverNumber === posEntry.driverNumber)
              : null;

            return (
              <div key={pos} className="rounded-sm bg-paddock-surface-low p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold uppercase tracking-widest text-paddock-on">
                    Podium P{pos}
                  </h3>
                  <span className="rounded-full bg-paddock-surface-highest px-2.5 py-0.5 font-display text-[10px] font-semibold tabular-nums text-paddock-on">
                    {ptsForPosition(pos)} PTS
                  </span>
                </div>

                {selectedDriver ? (
                  <div className="flex items-center gap-3 rounded-sm bg-paddock-surface px-3 py-2.5">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-sm">
                      <Image
                        src={getDriverImageUrl(
                          selectedDriver.driverNumber,
                          selectedDriver.name,
                          selectedDriver.teamName
                        )}
                        alt={selectedDriver.name}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-display text-[9px] font-semibold uppercase tracking-widest text-paddock-on-muted">
                        {selectedDriver.teamName}
                      </span>
                      <p className="font-display text-sm font-bold uppercase tracking-tight text-paddock-on">
                        {getDriverLastName(selectedDriver.driverNumber)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePositionChange(pos, 0)}
                      className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-sm text-paddock-on-muted touch-manipulation transition-colors hover:bg-paddock-surface-high hover:text-paddock-on active:bg-paddock-surface-high"
                      aria-label={`Clear podium P${pos}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <DriverCombobox
                    drivers={drivers}
                    value={undefined}
                    onChange={(driverNumber) =>
                      handlePositionChange(pos, driverNumber)
                    }
                    excludeDriverNumbers={predictedPositions
                      .filter((p) => p.position !== pos)
                      .map((p) => p.driverNumber)
                      .filter((n) => n !== 0)}
                    placeholder="Select driver..."
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Positions 4–10 */}
        <div className="rounded-sm bg-paddock-surface-low p-5">
          <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-widest text-paddock-on">
            Positions 4–10
          </h3>
          <div className="space-y-2">
            {predictedPositions
              .filter((p) => p.position >= 4)
              .map((pos) => {
                const selectedDriver = pos.driverNumber
                  ? drivers.find((d) => d.driverNumber === pos.driverNumber)
                  : null;

                return (
                  <div key={pos.position} className="flex items-center gap-3">
                    <div className="flex w-14 shrink-0 flex-col items-end leading-none">
                      <span className="font-display text-lg font-black italic tabular-nums text-paddock-on-muted/30">
                        {String(pos.position).padStart(2, "0")}
                      </span>
                      <span className="mt-0.5 font-display text-[8px] font-semibold tabular-nums text-paddock-on-muted/45">
                        {ptsForPosition(pos.position)} pts
                      </span>
                    </div>

                    {selectedDriver ? (
                      <div className="flex min-w-0 flex-1 items-center gap-3 rounded-sm bg-paddock-surface px-3 py-2">
                        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-sm">
                          <Image
                            src={getDriverImageUrl(
                              selectedDriver.driverNumber,
                              selectedDriver.name,
                              selectedDriver.teamName
                            )}
                            alt={selectedDriver.name}
                            fill
                            className="object-cover"
                            sizes="32px"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="font-display text-sm font-bold uppercase tracking-wide text-paddock-on">
                            {getDriverLastName(selectedDriver.driverNumber)}
                          </span>
                          <span className="ml-2 font-display text-[9px] uppercase tracking-widest text-paddock-on-muted">
                            {selectedDriver.teamName}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handlePositionChange(pos.position, 0)}
                          className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-sm text-paddock-on-muted touch-manipulation transition-colors hover:text-paddock-on active:bg-paddock-surface-high"
                          aria-label={`Clear position ${pos.position}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <DriverCombobox
                        drivers={drivers}
                        value={undefined}
                        onChange={(driverNumber) =>
                          handlePositionChange(pos.position, driverNumber)
                        }
                        excludeDriverNumbers={predictedPositions
                          .filter((p) => p.position !== pos.position)
                          .map((p) => p.driverNumber)
                          .filter((n) => n !== 0)}
                        placeholder="Select driver..."
                        className="min-w-0 flex-1"
                      />
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Pole Position & Fastest Lap */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Pole Position */}
          <div className="rounded-sm bg-paddock-surface-low p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-sm font-bold uppercase tracking-widest text-paddock-on">
                Pole Position
              </h3>
              <span className="rounded-full bg-paddock-surface-highest px-2.5 py-0.5 font-display text-[10px] font-semibold tabular-nums text-paddock-on">
                {polePts} PTS
              </span>
            </div>
            {(() => {
              const selectedDriver = polePositionDriverId
                ? drivers.find((d) => d.driverNumber === polePositionDriverId)
                : null;
              if (selectedDriver) {
                return (
                  <div className="flex items-center gap-3 rounded-sm bg-paddock-surface px-3 py-2.5">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-sm">
                      <Image
                        src={getDriverImageUrl(
                          selectedDriver.driverNumber,
                          selectedDriver.name,
                          selectedDriver.teamName
                        )}
                        alt={selectedDriver.name}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm font-bold uppercase tracking-tight text-paddock-on">
                        {getDriverLastName(selectedDriver.driverNumber)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPolePositionDriverId(undefined)}
                      className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-sm text-paddock-on-muted touch-manipulation transition-colors hover:text-paddock-on active:bg-paddock-surface-high"
                      aria-label="Clear pole position"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              }
              return (
                <DriverCombobox
                  drivers={drivers}
                  value={undefined}
                  onChange={(num) => setPolePositionDriverId(num)}
                  excludeDriverNumbers={[]}
                  placeholder="Select driver..."
                />
              );
            })()}
          </div>

          {/* Fastest Lap */}
          <div className="rounded-sm bg-paddock-surface-low p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-sm font-bold uppercase tracking-widest text-paddock-on">
                Fastest Lap
              </h3>
              <span className="rounded-full bg-paddock-surface-highest px-2.5 py-0.5 font-display text-[10px] font-semibold tabular-nums text-paddock-on">
                {fastestPts} PTS
              </span>
            </div>
            {(() => {
              const selectedDriver = fastestLapDriverId
                ? drivers.find((d) => d.driverNumber === fastestLapDriverId)
                : null;
              if (selectedDriver) {
                return (
                  <div className="flex items-center gap-3 rounded-sm bg-paddock-surface px-3 py-2.5">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-sm">
                      <Image
                        src={getDriverImageUrl(
                          selectedDriver.driverNumber,
                          selectedDriver.name,
                          selectedDriver.teamName
                        )}
                        alt={selectedDriver.name}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm font-bold uppercase tracking-tight text-paddock-on">
                        {getDriverLastName(selectedDriver.driverNumber)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFastestLapDriverId(undefined)}
                      className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-sm text-paddock-on-muted touch-manipulation transition-colors hover:text-paddock-on active:bg-paddock-surface-high"
                      aria-label="Clear fastest lap"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              }
              return (
                <DriverCombobox
                  drivers={drivers}
                  value={undefined}
                  onChange={(num) => setFastestLapDriverId(num)}
                  excludeDriverNumbers={[]}
                  placeholder="Select driver..."
                />
              );
            })()}
          </div>
        </div>

        {/* DNFs */}
        <div className="rounded-sm bg-paddock-surface-low p-5">
          <h3 className="mb-1 font-display text-sm font-bold uppercase tracking-widest text-paddock-on">
            DNF (Did Not Finish)
          </h3>
          <p className="mb-4 text-xs text-paddock-on-muted">
            Select drivers who won&apos;t finish the race (optional). Scoring:{" "}
            {dnfMultRate > 0 ? (
              <>
                (positions + fastest lap + pole) × (1 + {dnfMultRate} × correct
                DNFs)
                {dnfMissPts > 0 ? `; −${dnfMissPts} per miss` : ""}.
              </>
            ) : dnfMissPts > 0 ? (
              <>−{dnfMissPts} pts per predicted DNF who finishes.</>
            ) : (
              <>No DNF multiplier or penalty configured.</>
            )}
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
            {drivers.map((driver) => {
              const isDnf = dnfDriverIds.includes(driver.driverNumber);
              const lastName = driver.name.split(" ").pop() || driver.name;
              return (
                <button
                  key={driver.driverNumber}
                  type="button"
                  onClick={() => toggleDnf(driver.driverNumber)}
                  className={cn(
                    "flex min-h-[44px] flex-col items-center justify-center gap-1.5 rounded-sm px-1.5 py-2 touch-manipulation transition-colors active:scale-[0.98]",
                    isDnf
                      ? "bg-paddock-accent/20 ring-1 ring-paddock-accent"
                      : "bg-paddock-surface hover:bg-paddock-surface-high"
                  )}
                >
                  <div
                    className={cn(
                      "relative h-8 w-8 overflow-hidden rounded-full",
                      isDnf && "opacity-60"
                    )}
                  >
                    <Image
                      src={getDriverImageUrl(
                        driver.driverNumber,
                        driver.name,
                        driver.teamName
                      )}
                      alt={driver.name}
                      fill
                      className="object-cover"
                      sizes="32px"
                    />
                  </div>
                  <span
                    className={cn(
                      "text-center font-display text-[9px] font-semibold uppercase tracking-wider",
                      isDnf ? "text-paddock-accent" : "text-paddock-on-muted"
                    )}
                  >
                    {lastName.slice(0, 4)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right sidebar — Submit strategy + host tools */}
      <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-sm bg-paddock-accent p-5">
          <h3 className="font-display text-lg font-black italic uppercase tracking-tight text-white">
            Submit Strategy
          </h3>
          <p className="mt-1 font-display text-[10px] font-semibold uppercase tracking-widest text-white/70">
            {isLocked
              ? "Locked picks cannot be edited"
              : "Lock in your predictions before the deadline"}
          </p>

          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-display text-[10px] font-semibold uppercase tracking-widest text-white/70">
                Positions Filled
              </span>
              <span className="font-display text-sm font-bold text-white">
                {filledCount} / 10
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-display text-[10px] font-semibold uppercase tracking-widest text-white/70">
                Pole Position
              </span>
              <span className="font-display text-sm font-bold text-white">
                {polePositionDriverId ? "Set" : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-display text-[10px] font-semibold uppercase tracking-widest text-white/70">
                Fastest Lap
              </span>
              <span className="font-display text-sm font-bold text-white">
                {fastestLapDriverId ? "Set" : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-display text-[10px] font-semibold uppercase tracking-widest text-white/70">
                DNFs Selected
              </span>
              <span className="font-display text-sm font-bold text-white">
                {dnfDriverIds.length}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isLocked}
            className={cn(
              "mt-5 flex min-h-12 w-full items-center justify-center rounded-sm px-4 py-3 font-display text-[11px] font-bold uppercase tracking-widest touch-manipulation transition-colors active:opacity-90",
              isLocked
                ? "cursor-not-allowed bg-white/20 text-white/50"
                : "bg-white text-paddock-accent hover:bg-white/90"
            )}
          >
            {isSubmitting
              ? "Submitting..."
              : isLocked
                ? isPast
                  ? "Race Complete"
                  : "Predictions Locked"
                : currentPrediction
                  ? "Update Picks"
                  : "Lock Choices"}
          </button>
        </div>

        {/* Host tools */}
        {currentUser && currentUser._id === room.hostId && (
          <>
            <UnlockPredictions
              room={room}
              race={race}
              lockoutInfo={lockoutInfo}
            />
            <SyncRaceResults
              room={room}
              race={race}
              currentUser={currentUser}
              compact
            />
          </>
        )}
      </div>
    </div>
  );
}
