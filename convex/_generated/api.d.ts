/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as lib_lockout from "../lib/lockout.js";
import type * as lib_userHelpers from "../lib/userHelpers.js";
import type * as mutations_auth from "../mutations/auth.js";
import type * as mutations_predictions from "../mutations/predictions.js";
import type * as mutations_races from "../mutations/races.js";
import type * as mutations_rooms from "../mutations/rooms.js";
import type * as mutations_scoring from "../mutations/scoring.js";
import type * as mutations_seasons from "../mutations/seasons.js";
import type * as openf1 from "../openf1.js";
import type * as queries_auth from "../queries/auth.js";
import type * as queries_leaderboard from "../queries/leaderboard.js";
import type * as queries_lockout from "../queries/lockout.js";
import type * as queries_predictions from "../queries/predictions.js";
import type * as queries_races from "../queries/races.js";
import type * as queries_rooms from "../queries/rooms.js";
import type * as queries_seasons from "../queries/seasons.js";
import type * as queries_stats from "../queries/stats.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "lib/lockout": typeof lib_lockout;
  "lib/userHelpers": typeof lib_userHelpers;
  "mutations/auth": typeof mutations_auth;
  "mutations/predictions": typeof mutations_predictions;
  "mutations/races": typeof mutations_races;
  "mutations/rooms": typeof mutations_rooms;
  "mutations/scoring": typeof mutations_scoring;
  "mutations/seasons": typeof mutations_seasons;
  openf1: typeof openf1;
  "queries/auth": typeof queries_auth;
  "queries/leaderboard": typeof queries_leaderboard;
  "queries/lockout": typeof queries_lockout;
  "queries/predictions": typeof queries_predictions;
  "queries/races": typeof queries_races;
  "queries/rooms": typeof queries_rooms;
  "queries/seasons": typeof queries_seasons;
  "queries/stats": typeof queries_stats;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
