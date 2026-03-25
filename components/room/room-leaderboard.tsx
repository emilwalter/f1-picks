"use client";

import { cn } from "@/lib/utils";
import type { Doc } from "@/convex/_generated/dataModel";
import { UserAvatar } from "@/components/ui/user-avatar";

interface LeaderboardEntry {
  _id: string;
  roomId: string;
  userId: string;
  points: number;
  breakdown: {
    positionPoints: number;
    fastestLapPoints: number;
    polePositionPoints: number;
    dnfMultiplierApplied?: number;
    dnfMultiplierBonus?: number;
    dnfPenalty: number;
    total: number;
  };
  calculatedAt: number;
  user: Doc<"users"> | null;
}

interface RoomLeaderboardProps {
  leaderboard: LeaderboardEntry[];
  showBreakdown?: boolean;
  compact?: boolean;
}

export function RoomLeaderboard({
  leaderboard,
  showBreakdown = false,
  compact = false,
}: RoomLeaderboardProps) {
  if (leaderboard.length === 0) {
    return (
      <div className="py-8 text-center font-display text-sm uppercase tracking-widest text-paddock-on-muted">
        No scores yet. Results will appear here after the race.
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-1">
        {leaderboard.slice(0, 5).map((entry, index) => {
          const rank = index + 1;
          const username = entry.user?.username || "Unknown";
          const avatarUrl = entry.user?.avatarUrl;
          return (
            <div
              key={entry._id}
              className={cn(
                "flex items-center gap-3 rounded-sm px-3 py-2.5",
                rank === 1 && "bg-paddock-accent/10",
                rank === 2 && "bg-paddock-surface-high/50"
              )}
            >
              <span
                className={cn(
                  "w-8 font-display text-lg font-black italic tabular-nums",
                  rank === 1 ? "text-paddock-accent" : "text-paddock-on-muted"
                )}
              >
                {String(rank).padStart(2, "0")}
              </span>
              <UserAvatar
                username={username}
                avatarUrl={avatarUrl}
                size="sm"
                fallbackTone={rank === 1 ? "accent" : "muted"}
                className={cn(
                  rank === 1 && "ring-2 ring-paddock-accent/35",
                  rank === 2 && "ring-1 ring-white/15"
                )}
              />
              <div className="min-w-0 flex-1">
                <span className="truncate text-sm font-medium text-paddock-on">
                  {username}
                </span>
              </div>
              <span
                className={cn(
                  "font-display text-lg font-bold tabular-nums",
                  rank === 1 ? "text-paddock-accent" : "text-paddock-on"
                )}
              >
                {entry.points.toLocaleString()}
              </span>
              <span className="font-display text-[9px] font-medium uppercase tracking-widest text-paddock-on-muted">
                pts
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      {/* Header row */}
      <div className="mb-2 flex items-center gap-4 px-3 py-2">
        <span className="w-12 font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted">
          Pos
        </span>
        <span className="flex-1 font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted">
          Driver / User
        </span>
        {showBreakdown && (
          <>
            <span className="hidden w-20 text-right font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted sm:block">
              Positions
            </span>
            <span className="hidden w-20 text-right font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted sm:block">
              FL
            </span>
            <span className="hidden w-16 text-right font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted sm:block">
              Pole
            </span>
            <span className="hidden w-16 text-right font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted sm:block">
              DNF ×
            </span>
            <span className="hidden w-14 text-right font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted sm:block">
              DNF−
            </span>
          </>
        )}
        <span className="w-20 text-right font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted">
          Points
        </span>
      </div>

      {/* Entries */}
      <div className="space-y-1">
        {leaderboard.map((entry, index) => {
          const rank = index + 1;
          const username = entry.user?.username || "Unknown";
          const avatarUrl = entry.user?.avatarUrl;

          const isFirst = rank === 1;
          const isSecond = rank === 2;

          return (
            <div
              key={entry._id}
              className={cn(
                "flex items-center gap-4 rounded-sm px-3 py-3 transition-colors",
                isFirst &&
                  "border-l-4 border-paddock-accent bg-paddock-accent/[0.08]",
                isSecond && "bg-paddock-surface-high/40",
                !isFirst && "border-l-4 border-transparent"
              )}
            >
              {/* Position number */}
              <div className="w-12">
                <span
                  className={cn(
                    "font-display text-2xl font-black italic tabular-nums",
                    isFirst ? "text-paddock-accent" : "text-paddock-on-muted"
                  )}
                >
                  {String(rank).padStart(2, "0")}
                </span>
              </div>

              {/* Avatar + name */}
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <UserAvatar
                  username={username}
                  avatarUrl={avatarUrl}
                  size="md"
                  fallbackTone={isFirst ? "accent" : "muted"}
                  className={cn(
                    isFirst && "ring-2 ring-paddock-accent/40",
                    isSecond && "ring-1 ring-white/15"
                  )}
                />
                <div className="min-w-0">
                  <span className="block truncate font-display text-sm font-bold uppercase tracking-wide text-paddock-on">
                    {username}
                  </span>
                </div>
              </div>

              {/* Breakdown columns */}
              {showBreakdown && (
                <>
                  <span className="hidden w-20 text-right font-mono text-sm tabular-nums text-paddock-on sm:block">
                    {entry.breakdown.positionPoints.toFixed(1)}
                  </span>
                  <span className="hidden w-20 text-right font-mono text-sm tabular-nums text-paddock-on sm:block">
                    {entry.breakdown.fastestLapPoints}
                  </span>
                  <span className="hidden w-16 text-right font-mono text-sm tabular-nums text-paddock-on sm:block">
                    {entry.breakdown.polePositionPoints}
                  </span>
                  <span className="hidden w-16 text-right font-mono text-sm tabular-nums text-paddock-on sm:block">
                    {(entry.breakdown.dnfMultiplierApplied ?? 1) === 1
                      ? "—"
                      : `${(entry.breakdown.dnfMultiplierApplied ?? 1).toFixed(2)}×`}
                  </span>
                  <span className="hidden w-14 text-right font-mono text-sm tabular-nums text-paddock-accent sm:block">
                    {entry.breakdown.dnfPenalty}
                  </span>
                </>
              )}

              {/* Points */}
              <div className="w-20 text-right">
                <span
                  className={cn(
                    "font-display text-xl font-black tabular-nums",
                    isFirst ? "text-paddock-accent" : "text-paddock-on"
                  )}
                >
                  {entry.points.toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
