"use client";

import { useState, useEffect } from "react";
import {
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
  intervalToDuration,
} from "date-fns";
import { cn } from "@/lib/utils";

interface CountdownProps {
  targetTime: number | null; // Unix timestamp in milliseconds
  label: string;
  className?: string;
  expiredLabel?: string;
}

/**
 * Formats milliseconds into a human-readable countdown string (DD:HH:MM:SS)
 */
function formatCountdown(targetTime: number): string {
  const now = Date.now();
  if (targetTime <= now) {
    return "00:00:00:00";
  }

  const days = differenceInDays(targetTime, now);
  const hours = differenceInHours(targetTime, now) % 24;
  const minutes = differenceInMinutes(targetTime, now) % 60;
  const seconds = differenceInSeconds(targetTime, now) % 60;

  return `${String(days).padStart(2, "0")}:${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Formats milliseconds into a more readable format (e.g., "2 days, 3 hours")
 */
function formatCountdownReadable(targetTime: number): string {
  const now = Date.now();
  if (targetTime <= now) {
    return "Expired";
  }

  const duration = intervalToDuration({
    start: now,
    end: targetTime,
  });

  const parts: string[] = [];
  if (duration.days && duration.days > 0) {
    parts.push(`${duration.days} ${duration.days === 1 ? "day" : "days"}`);
  }
  if (duration.hours && duration.hours > 0) {
    parts.push(`${duration.hours} ${duration.hours === 1 ? "hour" : "hours"}`);
  }
  if (duration.minutes && duration.minutes > 0 && !duration.days) {
    parts.push(
      `${duration.minutes} ${duration.minutes === 1 ? "minute" : "minutes"}`
    );
  }
  if (
    duration.seconds &&
    duration.seconds > 0 &&
    !duration.days &&
    !duration.hours
  ) {
    parts.push(
      `${duration.seconds} ${duration.seconds === 1 ? "second" : "seconds"}`
    );
  }

  return parts.length > 0 ? parts.join(", ") : "Less than a second";
}

export function Countdown({
  targetTime,
  label,
  className,
  expiredLabel = "Expired",
}: CountdownProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (targetTime === null) {
      return;
    }

    // Update every second
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTime]);

  if (targetTime === null) {
    return (
      <div
        className={cn("text-sm text-zinc-600 dark:text-zinc-400", className)}
      >
        <div className="mb-1 text-xs font-medium">{label}</div>
        <div className="text-zinc-500 dark:text-zinc-500">Not available</div>
      </div>
    );
  }

  const isExpired = targetTime <= now;

  return (
    <div className={cn("text-sm", className)}>
      <div className="mb-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
        {label}
      </div>
      {isExpired ? (
        <div className="font-mono font-semibold text-red-600 dark:text-red-400">
          {expiredLabel}
        </div>
      ) : (
        <div className="space-y-1">
          <div className="font-mono text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {formatCountdown(targetTime)}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-500">
            {formatCountdownReadable(targetTime)}
          </div>
        </div>
      )}
    </div>
  );
}
