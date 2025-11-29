import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { ensureUser as ensureUserHelper } from "../lib/userHelpers";

/**
 * Ensure the current user exists in the database, creating or updating if necessary.
 * This syncs Clerk user data to Convex for use in relationships (foreign keys).
 *
 * Note: For display purposes, use Clerk's useUser() hook client-side.
 * This mutation can be called directly, but most mutations use the helper function instead.
 */
export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    return await ensureUserHelper(ctx);
  },
});
