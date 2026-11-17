/**
 * Per-race rules a host can switch on for a single race in a room, on top of
 * the room's normal scoring. Pure definitions shared by the backend (scoring,
 * validation) and the frontend (prediction form, results).
 */
import { v } from "convex/values";

export const RACE_RULE_KINDS = [
  "setMultiplier",
  "nearMiss",
  "doubleDown",
  "blackjack",
] as const;

export type RaceRuleKind = (typeof RACE_RULE_KINDS)[number];

/** One active rule. An object, not a bare kind, so rules can carry settings later. */
export interface RaceRule {
  kind: RaceRuleKind;
}

export const raceRuleValidator = v.object({
  kind: v.union(
    v.literal("setMultiplier"),
    v.literal("nearMiss"),
    v.literal("doubleDown"),
    v.literal("blackjack")
  ),
});

/** Picks that only matter when a rule asking for them is active. */
export interface PredictionExtras {
  /** Which of the player's own top 10 slots they double down on (1-10). */
  doubleDownPosition?: number;
  /** Exactly three driver numbers when played. */
  blackjackDriverIds?: number[];
}

export const predictionExtrasValidator = v.object({
  doubleDownPosition: v.optional(v.number()),
  blackjackDriverIds: v.optional(v.array(v.number())),
});

/**
 * One labelled line a rule adds to a score. `label` is the detail only
 * ("8/10, ×2"); the UI takes the rule's name from RACE_RULE_INFO. `rule` stays machine-readable so
 * later features can add lines up across races, e.g. a pot built from every
 * negative doubleDown line.
 */
export interface RuleLine {
  rule: RaceRuleKind;
  label: string;
  points: number;
}

export const ruleLineValidator = v.object({
  rule: v.union(
    v.literal("setMultiplier"),
    v.literal("nearMiss"),
    v.literal("doubleDown"),
    v.literal("blackjack")
  ),
  label: v.string(),
  points: v.number(),
});

export const RACE_RULE_INFO: Record<
  RaceRuleKind,
  {
    name: string;
    /** The payout in a few characters, shown next to the name. */
    payout: string;
    /** One or two sentences, in player terms. */
    summary: string;
    needsPicks: boolean;
  }
> = {
  setMultiplier: {
    name: "Set Multiplier",
    payout: "up to ×5",
    summary:
      "Your picks that finish in the top 10, in any order, multiply your race score.",
    needsPicks: false,
  },
  nearMiss: {
    name: "Near-Miss",
    payout: "½ slot",
    summary: "A pick that finishes one place off pays half its slot.",
    needsPicks: false,
  },
  doubleDown: {
    name: "Double Down",
    payout: "3× or −1×",
    summary:
      "Tap 3× on one pick. An exact finish triples that slot. Anything else costs you the slot.",
    needsPicks: true,
  },
  blackjack: {
    name: "Blackjack",
    payout: "15 · 30",
    summary:
      "Three drivers, finishing positions added up. Closest to 21 without going over wins 15, exactly 21 wins 30.",
    needsPicks: true,
  },
};

/** Highest tier first. Fewer than 6 hits: no multiplier. */
export const SET_MULTIPLIER_TIERS: ReadonlyArray<{
  hits: number;
  multiplier: number;
}> = [
  { hits: 10, multiplier: 5 },
  { hits: 9, multiplier: 3 },
  { hits: 8, multiplier: 2 },
  { hits: 7, multiplier: 1.5 },
  { hits: 6, multiplier: 1.2 },
];

export function setMultiplierFor(hits: number): number {
  return SET_MULTIPLIER_TIERS.find((t) => hits >= t.hits)?.multiplier ?? 1;
}

export const DOUBLE_DOWN_FACTOR = 3;
export const BLACKJACK_TARGET = 21;
export const BLACKJACK_WIN_POINTS = 15;
export const BLACKJACK_EXACT_POINTS = 30;
export const BLACKJACK_PICKS = 3;

export type BlackjackHand =
  | { status: "notPlayed" }
  | { status: "dnf"; driverNumbers: number[] }
  | { status: "bust"; sum: number }
  | { status: "live"; sum: number };

/**
 * Sum of the three drivers' finishing positions. A driver with no classified
 * finish, or one on the DNF list (classified on distance but stopped before
 * the flag), voids the hand.
 */
export function blackjackHand(
  driverIds: number[] | undefined,
  results: {
    positions: Array<{ position: number; driverNumber: number }>;
    dnfDriverIds: number[];
  }
): BlackjackHand {
  if (!driverIds || driverIds.length !== BLACKJACK_PICKS) {
    return { status: "notPlayed" };
  }
  const finish = new Map(
    results.positions.map((p) => [p.driverNumber, p.position])
  );
  const dnf = new Set(results.dnfDriverIds);
  const out = driverIds.filter((d) => dnf.has(d) || !finish.has(d));
  if (out.length > 0) {
    return { status: "dnf", driverNumbers: out };
  }
  const sum = driverIds.reduce((acc, d) => acc + (finish.get(d) ?? 0), 0);
  return sum > BLACKJACK_TARGET
    ? { status: "bust", sum }
    : { status: "live", sum };
}

/** The winning sum across the room: highest live hand, or undefined when nobody has one. */
export function bestBlackjackSum(hands: BlackjackHand[]): number | undefined {
  let best: number | undefined;
  for (const hand of hands) {
    if (hand.status === "live" && (best === undefined || hand.sum > best)) {
      best = hand.sum;
    }
  }
  return best;
}

export function isRuleActive(
  rules: RaceRule[] | undefined,
  kind: RaceRuleKind
): boolean {
  return rules?.some((r) => r.kind === kind) ?? false;
}
