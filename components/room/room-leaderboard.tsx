"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Doc } from "@/convex/_generated/dataModel";

interface LeaderboardEntry {
  _id: string;
  roomId: string;
  userId: string;
  points: number;
  breakdown: {
    positionPoints: number;
    fastestLapPoints: number;
    polePositionPoints: number;
    dnfPenalty: number;
    total: number;
  };
  calculatedAt: number;
  user: Doc<"users"> | null;
}

interface RoomLeaderboardProps {
  leaderboard: LeaderboardEntry[];
  showBreakdown?: boolean;
}

export function RoomLeaderboard({
  leaderboard,
  showBreakdown = false,
}: RoomLeaderboardProps) {
  if (leaderboard.length === 0) {
    return (
      <div className="py-8 text-center text-zinc-600 dark:text-zinc-400">
        No scores yet. Results will appear here after the race.
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Leaderboard
      </h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rank</TableHead>
            <TableHead>User</TableHead>
            <TableHead className="text-right">Points</TableHead>
            {showBreakdown && (
              <>
                <TableHead className="text-right">Positions</TableHead>
                <TableHead className="text-right">Fastest Lap</TableHead>
                <TableHead className="text-right">Pole</TableHead>
                <TableHead className="text-right">DNF Penalty</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {leaderboard.map((entry, index) => {
            const rank = index + 1;
            const username = entry.user?.username || "Unknown";
            const initials = username
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            return (
              <TableRow key={entry._id}>
                <TableCell className="w-12">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-600 dark:text-zinc-400">
                      {rank}
                    </span>
                    {rank === 1 && (
                      <Badge variant="default" className="text-xs">
                        🏆
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {initials}
                    </div>
                    <span className="truncate font-medium">{username}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {entry.points}
                </TableCell>
                {showBreakdown && (
                  <>
                    <TableCell className="text-right">
                      {entry.breakdown.positionPoints.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.breakdown.fastestLapPoints}
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.breakdown.polePositionPoints}
                    </TableCell>
                    <TableCell className="text-right text-red-600 dark:text-red-400">
                      {entry.breakdown.dnfPenalty}
                    </TableCell>
                  </>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
