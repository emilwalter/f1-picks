"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function initialsFromUsername(username: string): string {
  return (
    username
      .split(/\s+/)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

const SIZES = {
  sm: { root: "h-8 w-8", text: "text-[10px]" },
  md: { root: "h-9 w-9", text: "text-xs" },
  lg: { root: "h-12 w-12", text: "text-sm" },
} as const;

export interface UserAvatarProps {
  username: string;
  avatarUrl?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
  /** Initials fallback when there is no profile image */
  fallbackTone?: "accent" | "muted";
}

export function UserAvatar({
  username,
  avatarUrl,
  size = "md",
  className,
  fallbackTone = "muted",
}: UserAvatarProps) {
  const s = SIZES[size];
  const fallbackBg =
    fallbackTone === "accent"
      ? "bg-paddock-accent/20 text-paddock-accent"
      : "bg-paddock-surface-high text-paddock-on-muted";

  return (
    <Avatar
      className={cn(s.root, "shrink-0 border border-white/15", className)}
    >
      {avatarUrl ? (
        <AvatarImage src={avatarUrl} alt="" className="object-cover" />
      ) : null}
      <AvatarFallback
        className={cn("font-display font-bold", s.text, fallbackBg)}
      >
        {initialsFromUsername(username)}
      </AvatarFallback>
    </Avatar>
  );
}
