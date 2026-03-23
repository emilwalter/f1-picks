"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFromUsername } from "@/components/ui/user-avatar";

export type AvatarStackUser = {
  _id: string;
  username: string;
  avatarUrl?: string | null;
  /** Muted treatment (e.g. wrong pick for this pit-wall slot when showing everyone). */
  dimmed?: boolean;
};

interface AvatarStackProps {
  users: Array<AvatarStackUser | null | undefined>;
  /** Shown before "+N" overflow (default 4). */
  maxVisible?: number;
  className?: string;
  size?: "sm" | "md";
  /**
   * `overlap` — compact pit-wall stack (default).
   * `spread` — separated circles so every face stays readable in tight table cells.
   */
  layout?: "overlap" | "spread";
  /** Highlights this user with a cyan ring when their pick for this slot is correct (ignored if `dimmed`). */
  emphasizeUserId?: string;
  /** Overrides the default screen-reader summary of the stack. */
  ariaLabel?: string;
}

const sizeClass = { sm: "h-[26px] w-[26px]", md: "h-[30px] w-[30px]" };
/** Negative margin pulls the next avatar left so stacks overlap (tighter = more faces per row). */
const overlapClass = { sm: "-ml-3", md: "-ml-3.5" };

/**
 * Overlapping circular avatars with ring separation (pit-wall telemetry style).
 */
export function AvatarStack({
  users,
  maxVisible = 4,
  className,
  size = "sm",
  layout = "overlap",
  emphasizeUserId,
  ariaLabel,
}: AvatarStackProps) {
  const list = users.filter((u): u is AvatarStackUser => Boolean(u));
  if (list.length === 0) return null;

  const visible = list.slice(0, maxVisible);
  const overflow = list.length - visible.length;
  const sz = sizeClass[size];
  const ol = overlapClass[size];
  const spread = layout === "spread";

  const defaultAria = `${list.length} player${list.length === 1 ? "" : "s"}`;

  return (
    <div
      className={cn(
        "relative z-0 flex items-center",
        spread && "min-w-0 flex-wrap gap-1",
        className
      )}
      aria-label={ariaLabel ?? defaultAria}
    >
      {visible.map((user, i) => {
        const isYou =
          emphasizeUserId !== undefined && user._id === emphasizeUserId;
        const dimmed = Boolean(user.dimmed);
        const highlightYou = isYou && !dimmed;
        /** First in list = left = on top; z decreases left → right. */
        const stackZ = spread ? undefined : (visible.length - i) * 10;
        return (
          <div
            key={user._id}
            className={cn(
              // Inset ring stays inside the circle so it isn’t visible under overlapping neighbors
              "relative shrink-0 overflow-hidden rounded-full ring-2 ring-inset",
              highlightYou ? "ring-paddock-cyan" : "ring-paddock-bg",
              sz,
              !spread && i > 0 && ol
            )}
            style={stackZ !== undefined ? { zIndex: stackZ } : undefined}
            title={
              dimmed
                ? `${user.username} — different pick for this slot`
                : highlightYou
                  ? `${user.username} (you)`
                  : user.username
            }
          >
            <div
              className={cn(
                "size-full rounded-full",
                // Mute wrong picks without opacity (avoids see-through / stacking issues over neighbors)
                dimmed && "grayscale brightness-[0.78]"
              )}
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
          </div>
        );
      })}
      {overflow > 0 && (
        <div
          className={cn(
            "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-paddock-surface-high font-display text-[10px] font-bold tabular-nums text-paddock-on ring-2 ring-inset ring-paddock-bg",
            sz,
            !spread && ol
          )}
          style={spread ? undefined : { zIndex: visible.length * 10 + 20 }}
          title={`${overflow} more`}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
