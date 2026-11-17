"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Dices } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { Doc } from "@/convex/_generated/dataModel";
import {
  RACE_RULE_INFO,
  RACE_RULE_KINDS,
  type RaceRule,
  type RaceRuleKind,
  type RuleLine,
} from "@/convex/lib/raceRules";

/** Host switches for this race's extra rules. Frozen once picks lock. */
export function RaceRulesHostPanel({
  room,
  race,
  rules,
  isLocked,
}: {
  room: Doc<"rooms">;
  race: Doc<"races">;
  rules: RaceRule[];
  isLocked: boolean;
}) {
  const setRaceRules = useMutation(api.mutations.raceRules.setRaceRules);
  const [pending, setPending] = useState<RaceRuleKind | null>(null);
  const active = new Set(rules.map((r) => r.kind));

  const toggle = async (kind: RaceRuleKind, on: boolean) => {
    const next = new Set(active);
    if (on) next.add(kind);
    else next.delete(kind);
    setPending(kind);
    try {
      await setRaceRules({
        roomId: room._id,
        raceId: race._id,
        rules: [...next].map((k) => ({ kind: k })),
      });
      toast.success(
        `${RACE_RULE_INFO[kind].name} ${on ? "on" : "off"} for this race`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update race rules"
      );
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="rounded-sm bg-paddock-surface-low p-4">
      <h4 className="mb-1 flex items-center gap-2 font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted">
        <Dices className="h-3 w-3" aria-hidden />
        Race rules
      </h4>
      <p className="mb-3 text-[11px] leading-snug text-paddock-on-muted">
        {isLocked
          ? "Locked with the picks. Rules can't change after picks close."
          : "Extra scoring for this race only. Players see these on the picks page."}
      </p>
      <div className="space-y-2.5">
        {RACE_RULE_KINDS.map((kind) => {
          const id = `race-rule-${kind}`;
          return (
            <div key={kind} className="flex items-center justify-between gap-3">
              <Label
                htmlFor={id}
                className="cursor-pointer font-display text-[11px] font-semibold uppercase tracking-wider text-paddock-on"
              >
                {RACE_RULE_INFO[kind].name}
              </Label>
              <Switch
                id={id}
                checked={active.has(kind)}
                disabled={isLocked || pending !== null}
                onCheckedChange={(on) => toggle(kind, on)}
                className="data-[state=checked]:bg-paddock-cyan"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** What's different about this race, shown to every player. */
export function RaceRulesBanner({
  rules,
  className,
}: {
  rules: RaceRule[];
  className?: string;
}) {
  if (rules.length === 0) return null;
  return (
    <div
      className={cn(
        "rounded-sm border-l-4 border-paddock-cyan bg-paddock-cyan/[0.06] px-4 py-4 sm:px-5",
        className
      )}
    >
      <p className="mb-3 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-paddock-on">
        <Dices className="h-4 w-4 text-paddock-cyan" aria-hidden />
        Special rules this race
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {rules.map((rule) => (
          <li key={rule.kind}>
            <p className="font-display text-[11px] font-bold uppercase tracking-widest text-paddock-cyan">
              {RACE_RULE_INFO[rule.kind].name}
            </p>
            <p className="mt-0.5 text-xs leading-snug text-paddock-on-muted">
              {RACE_RULE_INFO[rule.kind].summary}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatPoints(points: number) {
  const rounded = Math.round(points * 100) / 100;
  if (rounded === 0) return "0";
  return `${rounded > 0 ? "+" : "−"}${Math.abs(rounded).toLocaleString(
    undefined,
    { maximumFractionDigits: 2 }
  )}`;
}

/** Every player's rule lines for a scored race. */
export function RaceRulesResults({
  entries,
}: {
  entries: Array<{
    _id: string;
    points: number;
    breakdown: { ruleLines?: RuleLine[] };
    user: Doc<"users"> | null;
  }>;
}) {
  const withLines = entries.filter(
    (e) => (e.breakdown.ruleLines?.length ?? 0) > 0
  );
  if (withLines.length === 0) return null;

  return (
    <section className="rounded-sm bg-paddock-surface-low">
      <div className="border-b border-white/5 px-5 py-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-widest text-paddock-on">
          <span className="h-6 w-1 shrink-0 bg-paddock-cyan" aria-hidden />
          Race rules payout
        </h2>
        <p className="mt-1 font-display text-[10px] uppercase tracking-[0.2em] text-paddock-on-muted">
          Already included in each player&apos;s race points
        </p>
      </div>
      <div className="divide-y divide-white/5">
        {withLines.map((entry) => {
          const username = entry.user?.username || "Unknown";
          return (
            <div key={entry._id} className="px-5 py-4">
              <div className="mb-2 flex items-center gap-3">
                <UserAvatar
                  username={username}
                  avatarUrl={entry.user?.avatarUrl}
                  size="sm"
                />
                <span className="truncate font-display text-sm font-bold uppercase tracking-wide text-paddock-on">
                  {username}
                </span>
              </div>
              <ul className="space-y-1">
                {entry.breakdown.ruleLines!.map((line) => (
                  <li
                    key={line.rule}
                    className="flex items-baseline justify-between gap-3 text-sm"
                  >
                    <span className="text-paddock-on-muted">{line.label}</span>
                    <span
                      className={cn(
                        "shrink-0 font-mono tabular-nums",
                        line.points > 0 && "text-paddock-cyan",
                        line.points < 0 && "text-paddock-accent",
                        line.points === 0 && "text-paddock-on-muted"
                      )}
                    >
                      {formatPoints(line.points)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
