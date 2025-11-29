import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get the current authenticated user from Convex database.
 * Returns null if not authenticated or user doesn't exist.
 *
 * Note: For display purposes (name, avatar, etc.), use Clerk's useUser() hook client-side.
 * This query returns the Convex user record needed for relationships and internal operations.
 *
 * The user record is automatically created when needed by mutations (createRoom, joinRoom, etc.).
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // Use identity.subject as authProviderId (Clerk user ID)
    const authProviderId = identity.subject;

    // Check if user exists in Convex
    const user = await ctx.db
      .query("users")
      .withIndex("by_auth_provider_id", (q) =>
        q.eq("authProviderId", authProviderId),
      )
      .first();

    return user;
  },
});
