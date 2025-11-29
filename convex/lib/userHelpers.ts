/**
 * Helper functions for user management.
 * These functions sync Clerk user data to Convex for use in relationships.
 *
 * Note: Clerk is the source of truth for user data (name, email, avatar, etc.).
 * Convex stores minimal user records only for relationships (foreign keys).
 */

import type { DatabaseWriter } from "../_generated/server";
import type { UserIdentity } from "convex/server";
import type { Id } from "../_generated/dataModel";

/**
 * Ensure a user exists in Convex, creating or updating from Clerk identity.
 * Returns the user ID.
 */
export async function ensureUser(ctx: {
  db: DatabaseWriter;
  auth: { getUserIdentity: () => Promise<UserIdentity | null> };
}): Promise<Id<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const authProviderId = identity.subject;

  // Check if user already exists
  const existingUser = await ctx.db
    .query("users")
    .withIndex("by_auth_provider_id", (q) =>
      q.eq("authProviderId", authProviderId),
    )
    .first();

  const now = Date.now();
  const userData = {
    authProviderId,
    username: identity.nickname || identity.name || "Anonymous",
    email: identity.email,
    avatarUrl: identity.pictureUrl,
    updatedAt: now,
  };

  if (existingUser) {
    // Update existing user with latest Clerk data
    await ctx.db.patch(existingUser._id, userData);
    return existingUser._id;
  }

  // Create new user record
  const userId = await ctx.db.insert("users", {
    ...userData,
    createdAt: now,
  });

  return userId;
}
