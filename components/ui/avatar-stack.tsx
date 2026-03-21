"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type AvatarStackUser = {
  _id: string;
  username: string;
  avatarUrl?: string | null;
};

function initialsFromUsername(username: string): string {
  return (
    username
      .split(/\s+/)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

interface AvatarStackProps {
  users: Array<AvatarStackUser | null | undefined>;
  /** Shown before "+N" overflow (default 4). */
  maxVisible?: number;
  className?: string;
  size?: "sm" | "md";
}

const sizeClass = { sm: "h-[26px] w-[26px]", md: "h-[30px] w-[30px]" };
const overlapClass = { sm: "-ml-2", md: "-ml-2.5" };

/**
 * Overlapping circular avatars with ring separation (pit-wall telemetry style).
 */
export function AvatarStack({
  users,
  maxVisible = 4,
  className,
  size = "sm",
}: AvatarStackProps) {
  const list = users.filter((u): u is AvatarStackUser => Boolean(u));
  if (list.length === 0) return null;

  const visible = list.slice(0, maxVisible);
  const overflow = list.length - visible.length;
  const sz = sizeClass[size];
  const ol = overlapClass[size];

  return (
    <div
      className={cn("isolate flex items-center", className)}
      aria-label={`${list.length} player${list.length === 1 ? "" : "s"}`}
    >
      {visible.map((user, i) => (
        <div
          key={user._id}
          className={cn(
            "relative rounded-full ring-2 ring-paddock-bg",
            sz,
            i > 0 && ol
          )}
          style={{ zIndex: visible.length - i }}
          title={user.username}
        >
          <Avatar
            className={cn("size-full rounded-full border border-white/20")}
          >
            {user.avatarUrl ? (
              <AvatarImage
                src={user.avatarUrl}
                alt=""
                className="object-cover"
              />
            ) : null}
            <AvatarFallback
              className={cn(
                "font-display text-[9px] font-bold text-paddock-on",
                "bg-paddock-accent/35"
              )}
            >
              {initialsFromUsername(user.username)}
            </AvatarFallback>
          </Avatar>
        </div>
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            "relative z-0 flex items-center justify-center rounded-full bg-paddock-surface-high font-display text-[10px] font-bold tabular-nums text-paddock-on ring-2 ring-paddock-bg",
            sz,
            ol
          )}
          title={`${overflow} more`}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
