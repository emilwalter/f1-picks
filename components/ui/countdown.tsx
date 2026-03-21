"use client";

import { useState, useEffect } from "react";
import {
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
} from "date-fns";
import { cn } from "@/lib/utils";

interface CountdownProps {
  targetTime: number | null;
  /** Uppercase telemetry label (e.g. "Race start"). Omit or "" to hide. */
  label?: string;
  className?: string;
  expiredLabel?: string;
  /** Classes for the live countdown digits (default: large timing screen). */
  timeClassName?: string;
  /** Classes for the expired / ended state line. */
  expiredClassName?: string;
}

function formatCountdown(targetTime: number): string {
  const now = Date.now();
  if (targetTime <= now) return "00:00:00";

  const hours = differenceInHours(targetTime, now);
  const minutes = differenceInMinutes(targetTime, now) % 60;
  const seconds = differenceInSeconds(targetTime, now) % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const defaultTimeClass =
  "font-display text-xl font-black tabular-nums tracking-tight text-paddock-on";

const defaultExpiredClass =
  "font-display text-sm font-bold uppercase tracking-wide text-paddock-accent";

/** Must match telemetry labels (Circuit / Date / Round) for alignment. */
const labelClass =
  "block font-display text-[10px] uppercase tracking-widest text-paddock-on-muted";

export function Countdown({
  targetTime,
  label = "",
  className,
  expiredLabel = "Expired",
  timeClassName,
  expiredClassName,
}: CountdownProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (targetTime === null) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [targetTime]);

  const showLabel = Boolean(label && label.trim());

  if (targetTime === null) {
    return (
      <div className={cn(className)}>
        {showLabel && <span className={labelClass}>{label}</span>}
        <p className="font-display text-sm font-bold text-paddock-on-muted">
          N/A
        </p>
      </div>
    );
  }

  const isExpired = targetTime <= now;

  return (
    <div className={cn(className)}>
      {showLabel && <span className={labelClass}>{label}</span>}
      {isExpired ? (
        <p className={expiredClassName ?? defaultExpiredClass}>
          {expiredLabel}
        </p>
      ) : (
        <p className={timeClassName ?? defaultTimeClass}>
          {formatCountdown(targetTime)}
        </p>
      )}
    </div>
  );
}
