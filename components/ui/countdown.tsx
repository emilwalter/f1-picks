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
  targetTime: number | null;
  label: string;
  className?: string;
  expiredLabel?: string;
}

function formatCountdown(targetTime: number): string {
  const now = Date.now();
  if (targetTime <= now) return "00:00:00";

  const hours = differenceInHours(targetTime, now);
  const minutes = differenceInMinutes(targetTime, now) % 60;
  const seconds = differenceInSeconds(targetTime, now) % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatCountdownReadable(targetTime: number): string {
  const now = Date.now();
  if (targetTime <= now) return "Expired";

  const duration = intervalToDuration({ start: now, end: targetTime });
  const parts: string[] = [];

  if (duration.days && duration.days > 0) {
    parts.push(`${duration.days}d`);
  }
  if (duration.hours && duration.hours > 0) {
    parts.push(`${duration.hours}h`);
  }
  if (duration.minutes && duration.minutes > 0 && !duration.days) {
    parts.push(`${duration.minutes}m`);
  }

  return parts.length > 0 ? parts.join(" ") : "<1m";
}

export function Countdown({
  targetTime,
  label,
  className,
  expiredLabel = "Expired",
}: CountdownProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (targetTime === null) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [targetTime]);

  if (targetTime === null) {
    return (
      <div className={cn(className)}>
        <div className="font-display text-[9px] font-semibold uppercase tracking-widest text-paddock-on-muted">
          {label}
        </div>
        <div className="mt-0.5 font-display text-sm font-bold text-paddock-on-muted">
          N/A
        </div>
      </div>
    );
  }

  const isExpired = targetTime <= now;

  return (
    <div className={cn(className)}>
      <div className="font-display text-[9px] font-semibold uppercase tracking-widest text-paddock-on-muted">
        {label}
      </div>
      {isExpired ? (
        <div className="mt-0.5 font-display text-sm font-bold uppercase tracking-wide text-paddock-accent">
          {expiredLabel}
        </div>
      ) : (
        <div className="mt-0.5">
          <div className="font-display text-xl font-black tabular-nums tracking-tight text-paddock-on">
            {formatCountdown(targetTime)}
          </div>
        </div>
      )}
    </div>
  );
}
