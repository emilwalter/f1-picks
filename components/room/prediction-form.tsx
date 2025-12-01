"use client";

import { useState, useEffect } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Image from "next/image";
import type { Doc } from "@/convex/_generated/dataModel";
import { getDriverImageUrl, getTeamLogoUrl } from "@/lib/f1-images";

interface PredictionFormProps {
  room: Doc<"rooms">;
  race: Doc<"races">;
  currentPrediction: Doc<"predictions"> | null | undefined;
  isLocked?: boolean; // Whether predictions are locked based on room settings
}

interface Driver {
  driverNumber: number;
  name: string;
  teamName: string;
  teamLogo?: string;
  countryCode: string;
}

export function PredictionForm({
  room,
  race,
  currentPrediction,
  isLocked: isLockedProp,
}: PredictionFormProps) {
  const submitPrediction = useMutation(
    api.mutations.predictions.submitPrediction
  );
  const getDriversForRace = useAction(api.actions.openf1.getDriversForRace);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [drivers, setDrivers] = useState<Driver[] | null>(null);
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(true);

  // Fetch drivers for this race
  useEffect(() => {
    const fetchDrivers = async () => {
      setIsLoadingDrivers(true);
      try {
        const raceDate = new Date(race.date).toISOString().split("T")[0];
        const driversData = await getDriversForRace({ date: raceDate });
        setDrivers(driversData);
      } catch (error) {
        console.error("Failed to fetch drivers:", error);
        toast.error("Failed to load drivers. Please try again.");
        setDrivers([]);
      } finally {
        setIsLoadingDrivers(false);
      }
    };

    fetchDrivers();
  }, [race.date, getDriversForRace]);

  // Form state
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

  // Update form when current prediction changes
  useEffect(() => {
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
  }, [currentPrediction]);

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

  // Check if race is locked or in the past
  const isPast = race.date < Date.now();
  // Use prop if provided (from room lockout settings), otherwise fall back to basic checks
  const isLocked =
    isLockedProp !== undefined
      ? isLockedProp
      : room.status !== "open" || isPast;

  const handleSubmit = async () => {
    if (isLocked) {
      if (isPast) {
        toast.error(
          "Cannot submit predictions for races that have already happened"
        );
      } else {
        toast.error("This room is not accepting predictions");
      }
      return;
    }

    // Validate that all positions are filled
    const missingPositions = predictedPositions.filter(
      (p) => p.driverNumber === 0
    );
    if (missingPositions.length > 0) {
      toast.error(
        `Please select drivers for positions ${missingPositions.map((p) => p.position).join(", ")}`
      );
      return;
    }

    // Check for duplicate drivers
    const driverNumbers = predictedPositions.map((p) => p.driverNumber);
    const duplicates = driverNumbers.filter(
      (num, index) => driverNumbers.indexOf(num) !== index
    );
    if (duplicates.length > 0) {
      toast.error("Each driver can only be selected once for positions");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitPrediction({
        roomId: room._id,
        raceId: race._id, // Add raceId!
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
      <Card>
        <CardContent className="py-8 text-center text-zinc-600 dark:text-zinc-400">
          Loading drivers...
        </CardContent>
      </Card>
    );
  }

  if (!drivers || drivers.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-zinc-600 dark:text-zinc-400">
          No drivers available for this race yet. Check back later!
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {currentPrediction ? "Update Prediction" : "Submit Prediction"}
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Select drivers for positions 1-10, pole position, fastest lap, and
          DNFs
        </p>
      </div>

      {/* Pole Position */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Pole Position 🏁
            <span className="ml-2 text-xs font-normal text-zinc-500">
              (Who will start on pole?)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {drivers.map((driver) => (
              <button
                key={driver.driverNumber}
                type="button"
                onClick={() =>
                  setPolePositionDriverId(
                    polePositionDriverId === driver.driverNumber
                      ? undefined
                      : driver.driverNumber
                  )
                }
                className={`group relative flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all ${
                  polePositionDriverId === driver.driverNumber
                    ? "border-red-600 bg-red-50 dark:bg-red-950"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                }`}
              >
                <div className="relative h-12 w-12 overflow-hidden rounded-full">
                  <Image
                    src={getDriverImageUrl(
                      driver.driverNumber,
                      driver.name,
                      driver.teamName
                    )}
                    alt={driver.name}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
                <div className="text-center">
                  <div className="text-xs font-medium text-zinc-900 dark:text-zinc-50">
                    {driver.name.split(" ")[0]}
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    #{driver.driverNumber}
                  </div>
                </div>
                {polePositionDriverId === driver.driverNumber && (
                  <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs">
                    ✓
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top 10 Positions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Race Positions 1-10 🏆
            <span className="ml-2 text-xs font-normal text-zinc-500">
              (Predict the finishing order)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {predictedPositions.map((pos) => {
              const selectedDriver = drivers.find(
                (d) => d.driverNumber === pos.driverNumber
              );

              // Get podium-specific styling
              let borderClass = "border-zinc-200 dark:border-zinc-800";
              let bgClass = "";
              let badgeClass =
                "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";

              if (pos.position === 1) {
                borderClass = "border-yellow-500 dark:border-yellow-500";
                bgClass = "bg-yellow-50 dark:bg-yellow-950";
                badgeClass = "bg-yellow-500 text-white";
              } else if (pos.position === 2) {
                borderClass = "border-slate-400 dark:border-slate-400";
                bgClass = "bg-slate-50 dark:bg-slate-950";
                badgeClass = "bg-slate-400 text-white";
              } else if (pos.position === 3) {
                borderClass = "border-orange-600 dark:border-orange-600";
                bgClass = "bg-orange-50 dark:bg-orange-950";
                badgeClass = "bg-orange-600 text-white";
              }

              return (
                <div
                  key={pos.position}
                  className={`flex items-center gap-3 rounded-lg border-2 p-3 ${borderClass} ${bgClass}`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold ${badgeClass}`}
                  >
                    {pos.position}
                  </div>
                  {selectedDriver ? (
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
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
                        <div className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                          {selectedDriver.name}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative h-4 w-4 shrink-0 overflow-hidden rounded">
                            <Image
                              src={getTeamLogoUrl(
                                selectedDriver.teamName,
                                selectedDriver.teamLogo
                              )}
                              alt={selectedDriver.teamName}
                              fill
                              className="object-cover"
                              sizes="16px"
                            />
                          </div>
                          <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                            {selectedDriver.teamName}
                          </span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePositionChange(pos.position, 0)}
                        className="shrink-0"
                      >
                        Clear
                      </Button>
                    </div>
                  ) : (
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <select
                        value={pos.driverNumber || ""}
                        onChange={(e) =>
                          handlePositionChange(
                            pos.position,
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        <option value="">Select driver...</option>
                        {drivers
                          .filter(
                            (d) =>
                              !predictedPositions.some(
                                (p) =>
                                  p.driverNumber === d.driverNumber &&
                                  p.position !== pos.position
                              )
                          )
                          .map((driver) => (
                            <option
                              key={driver.driverNumber}
                              value={driver.driverNumber}
                            >
                              #{driver.driverNumber} {driver.name} -{" "}
                              {driver.teamName}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Fastest Lap */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Fastest Lap ⚡
            <span className="ml-2 text-xs font-normal text-zinc-500">
              (Optional)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {drivers.map((driver) => (
              <button
                key={driver.driverNumber}
                type="button"
                onClick={() =>
                  setFastestLapDriverId(
                    fastestLapDriverId === driver.driverNumber
                      ? undefined
                      : driver.driverNumber
                  )
                }
                className={`group relative flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all ${
                  fastestLapDriverId === driver.driverNumber
                    ? "border-purple-600 bg-purple-50 dark:bg-purple-950"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                }`}
              >
                <div className="relative h-12 w-12 overflow-hidden rounded-full">
                  <Image
                    src={getDriverImageUrl(
                      driver.driverNumber,
                      driver.name,
                      driver.teamName
                    )}
                    alt={driver.name}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
                <div className="text-center">
                  <div className="text-xs font-medium text-zinc-900 dark:text-zinc-50">
                    {driver.name.split(" ")[0]}
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    #{driver.driverNumber}
                  </div>
                </div>
                {fastestLapDriverId === driver.driverNumber && (
                  <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs">
                    ✓
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* DNFs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            DNF (Did Not Finish) 🚩
            <span className="ml-2 text-xs font-normal text-zinc-500">
              (Optional - select drivers who won&apos;t finish)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {drivers.map((driver) => (
              <button
                key={driver.driverNumber}
                type="button"
                onClick={() => toggleDnf(driver.driverNumber)}
                className={`group relative flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all ${
                  dnfDriverIds.includes(driver.driverNumber)
                    ? "border-red-600 bg-red-50 dark:bg-red-950"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                }`}
              >
                <div className="relative h-12 w-12 overflow-hidden rounded-full opacity-75">
                  <Image
                    src={getDriverImageUrl(
                      driver.driverNumber,
                      driver.name,
                      driver.teamName
                    )}
                    alt={driver.name}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
                <div className="text-center">
                  <div className="text-xs font-medium text-zinc-900 dark:text-zinc-50">
                    {driver.name.split(" ")[0]}
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    #{driver.driverNumber}
                  </div>
                </div>
                {dnfDriverIds.includes(driver.driverNumber) && (
                  <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-red-600 p-0 text-xs">
                    ✕
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || isLocked}
        className="w-full"
        size="lg"
      >
        {isSubmitting
          ? "Submitting..."
          : isLocked
            ? isPast
              ? "Race Already Happened"
              : "Predictions Locked"
            : currentPrediction
              ? "Update Prediction"
              : "Submit Prediction"}
      </Button>
    </div>
  );
}
