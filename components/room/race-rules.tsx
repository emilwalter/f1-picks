"use client";

import { Fragment, useState } from "react";
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
  DOUBLE_DOWN_FACTOR,
  RACE_RULE_INFO,
  RACE_RULE_KINDS,
  SET_MULTIPLIER_TIERS,
  type RaceRule,
  type RaceRuleKind,
  type RuleLine,
} from "@/convex/lib/raceRules";

/** Lowest tier first, for the scale under Set Multiplier. */
const TIERS_ASCENDING = [...SET_MULTIPLIER_TIERS].reverse();

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
          ? "Locked with the picks."
          : "This race only. Locks with the picks."}
      </p>
      <div className="space-y-1">
        {RACE_RULE_KINDS.map((kind) => {
          const id = `race-rule-${kind}`;
          const on = active.has(kind);
          return (
            <div
              key={kind}
              className={cn(
                "flex min-h-11 items-center justify-between gap-3 rounded-sm px-2.5 transition-colors",
                on ? "bg-paddock-cyan/[0.08]" : "bg-paddock-surface"
              )}
            >
              <Label
                htmlFor={id}
                className="flex min-w-0 cursor-pointer flex-col items-start gap-0.5 py-2"
              >
                <span className="font-display text-[11px] font-semibold uppercase tracking-wider text-paddock-on">
                  {RACE_RULE_INFO[kind].name}
                </span>
                <span
                  className={cn(
                    "font-display text-[10px] tabular-nums",
                    on ? "text-paddock-cyan" : "text-paddock-on-muted"
                  )}
                >
                  {RACE_RULE_INFO[kind].payout}
                </span>
              </Label>
              <Switch
                id={id}
                checked={on}
                disabled={isLocked || pending !== null}
                onCheckedChange={(next) => toggle(kind, next)}
                className="data-[state=checked]:bg-paddock-cyan"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** The active rules, read once at the top of the picks page. */
export function RaceRulesBanner({
  rules,
  className,
}: {
  rules: RaceRule[];
  className?: string;
}) {
  if (rules.length === 0) return null;
  return (
    <section
      aria-labelledby="race-rules-heading"
      className={cn("rounded-sm bg-paddock-surface-low p-4 sm:p-5", className)}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2
          id="race-rules-heading"
          className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest text-paddock-on"
        >
          <Dices className="h-4 w-4 text-paddock-cyan" aria-hidden />
          Race rules
        </h2>
        <span className="rounded-full bg-paddock-surface-highest px-2.5 py-0.5 font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-cyan">
          This race only
        </span>
      </div>
      <ul
        className={cn(
          "grid gap-2 sm:grid-cols-2",
          rules.length >= 4 && "xl:grid-cols-4",
          rules.length === 3 && "xl:grid-cols-3"
        )}
      >
        {rules.map((rule) => {
          const info = RACE_RULE_INFO[rule.kind];
          return (
            <li
              key={rule.kind}
              className="flex flex-col rounded-sm bg-paddock-surface p-4"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-display text-[11px] font-bold uppercase tracking-widest text-paddock-on">
                  {info.name}
                </p>
                <p className="whitespace-nowrap font-display text-sm font-bold tabular-nums text-paddock-cyan">
                  {info.payout}
                </p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-paddock-on-muted">
                {info.summary}
              </p>
              {rule.kind === "setMultiplier" && (
                <ol
                  className="mt-auto grid grid-cols-5 gap-1 pt-4"
                  aria-label="Top 10 hits and their multiplier"
                >
                  {TIERS_ASCENDING.map((tier, i) => (
                    <li key={tier.hits}>
                      <div
                        className="h-1 rounded-full bg-paddock-cyan"
                        style={{ opacity: 0.25 + i * 0.1875 }}
                        aria-hidden
                      />
                      <p className="mt-1.5 font-display text-[10px] leading-none tabular-nums text-paddock-on-muted">
                        {tier.hits}/10
                      </p>
                      <p className="mt-1 font-display text-[11px] font-bold leading-none tabular-nums text-paddock-on">
                        ×{tier.multiplier}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The 3× toggle that sits on a filled top 10 slot while Double Down is on. */
export function DoubleDownToggle({
  position,
  slotPoints,
  selected,
  onToggle,
  disabled,
}: {
  position: number;
  slotPoints: number;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  const win = slotPoints * DOUBLE_DOWN_FACTOR;
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onToggle}
      title={
        selected
          ? `Doubled down: +${win} if exact, −${slotPoints} if not`
          : `Double down on P${position}: +${win} if exact, −${slotPoints} if not`
      }
      aria-label={
        selected
          ? `Remove Double Down from P${position}`
          : `Double down on P${position}`
      }
      className={cn(
        "inline-flex min-h-10 min-w-11 shrink-0 items-center justify-center rounded-sm px-2.5 font-display text-xs font-black tabular-nums touch-manipulation transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paddock-cyan disabled:cursor-not-allowed disabled:opacity-40",
        selected
          ? "bg-paddock-cyan text-paddock-bg hover:bg-paddock-cyan-soft"
          : "bg-paddock-surface-high text-paddock-on-muted hover:bg-paddock-surface-highest hover:text-paddock-cyan"
      )}
    >
      {DOUBLE_DOWN_FACTOR}×
    </button>
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

function pointsTone(points: number) {
  if (points > 0) return "text-paddock-cyan";
  if (points < 0) return "text-paddock-soft";
  return "text-paddock-on-muted";
}

/** Rule payouts for a scored race: one row per rule, one column per player. */
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
  const players = entries.filter(
    (e) => (e.breakdown.ruleLines?.length ?? 0) > 0
  );
  if (players.length === 0) return null;

  const kinds = RACE_RULE_KINDS.filter((kind) =>
    players.some((p) => p.breakdown.ruleLines!.some((l) => l.rule === kind))
  );
  const lineFor = (player: (typeof players)[number], kind: RaceRuleKind) =>
    player.breakdown.ruleLines!.find((l) => l.rule === kind);
  const totalFor = (player: (typeof players)[number]) =>
    player.breakdown.ruleLines!.reduce((sum, l) => sum + l.points, 0);

  const columns = `minmax(9rem,1fr) repeat(${players.length}, minmax(8.5rem,1fr))`;

  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 font-display text-xl font-bold uppercase tracking-widest text-paddock-on">
        <span className="h-6 w-1 bg-paddock-cyan" aria-hidden />
        Race rules payout
      </h2>
      <p className="mb-4 text-sm text-paddock-on-muted">
        Already counted in the race points above.
      </p>

      <div className="overflow-x-auto rounded-sm bg-paddock-surface-low">
        <div
          role="table"
          aria-label="Race rules payout per player"
          className="grid min-w-max sm:min-w-0"
          style={{ gridTemplateColumns: columns }}
        >
          <div role="row" className="contents">
            <div
              role="columnheader"
              className="px-4 py-3 font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-paddock-on-muted"
            >
              Rule
            </div>
            {players.map((p) => {
              const username = p.user?.username || "Unknown";
              return (
                <div
                  key={p._id}
                  role="columnheader"
                  className="flex min-w-0 items-center gap-2 px-4 py-3"
                >
                  <UserAvatar
                    username={username}
                    avatarUrl={p.user?.avatarUrl}
                    size="sm"
                  />
                  <span className="truncate font-display text-xs font-bold uppercase tracking-wide text-paddock-on">
                    {username}
                  </span>
                </div>
              );
            })}
          </div>

          {kinds.map((kind, rowIndex) => (
            <div key={kind} role="row" className="contents">
              <div
                role="rowheader"
                className={cn(
                  "px-4 py-3",
                  rowIndex % 2 === 0 && "bg-paddock-surface"
                )}
              >
                <p className="font-display text-[11px] font-bold uppercase tracking-widest text-paddock-on">
                  {RACE_RULE_INFO[kind].name}
                </p>
              </div>
              {players.map((p) => {
                const line = lineFor(p, kind);
                return (
                  <div
                    key={p._id}
                    role="cell"
                    className={cn(
                      "px-4 py-3",
                      rowIndex % 2 === 0 && "bg-paddock-surface"
                    )}
                  >
                    {line ? (
                      <Fragment>
                        <p
                          className={cn(
                            "font-display text-lg font-bold leading-none tabular-nums",
                            pointsTone(line.points)
                          )}
                        >
                          {formatPoints(line.points)}
                        </p>
                        <p className="mt-1.5 text-xs leading-snug text-paddock-on-muted">
                          {line.label}
                        </p>
                      </Fragment>
                    ) : (
                      <p className="text-xs leading-snug text-paddock-on-muted">
                        Not played
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          <div role="row" className="contents">
            <div
              role="rowheader"
              className="bg-paddock-surface-high px-4 py-3 font-display text-[11px] font-bold uppercase tracking-widest text-paddock-on"
            >
              Rules total
            </div>
            {players.map((p) => {
              const total = totalFor(p);
              return (
                <div
                  key={p._id}
                  role="cell"
                  className="bg-paddock-surface-high px-4 py-3"
                >
                  <p
                    className={cn(
                      "font-display text-xl font-black leading-none tabular-nums",
                      pointsTone(total)
                    )}
                  >
                    {formatPoints(total)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
