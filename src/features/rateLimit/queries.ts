import { lt, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { rateLimits } from "@/db/schema";

import { RATE_LIMITS, rateLimitKey, type RateLimitAction } from "./policy";

export type RateLimitResult = {
  allowed: boolean;
  // Attempts left in this window, for a "try again later" message.
  remaining: number;
  retryAfterSeconds: number;
};

// Roughly one sweep per hundred gated requests. Rows are reset in place, so the
// table only grows with distinct callers; this clears the long tail of
// addresses that appeared once and never came back.
const SWEEP_PROBABILITY = 0.01;
const SWEEP_OLDER_THAN_HOURS = 24;

// Consume one attempt and report whether it is allowed.
//
// The whole decision is ONE statement, so two concurrent requests cannot both
// read "4 used" and both proceed. ON CONFLICT does the reset-or-increment:
// if the stored window has expired the row starts again at 1, otherwise the
// count goes up. The RETURNING value is the post-increment count, which is what
// we compare against the limit.
export async function consumeRateLimit(
  action: RateLimitAction,
  identifier: { kind: "ip" | "user"; value: string },
): Promise<RateLimitResult> {
  const policy = RATE_LIMITS[action];
  const key = rateLimitKey(action, identifier);
  const windowMs = policy.windowSeconds * 1000;

  try {
    const expired = sql`${rateLimits.windowStart} < now() - make_interval(secs => ${policy.windowSeconds})`;

    const [row] = await getDb()
      .insert(rateLimits)
      .values({ key, count: 1 })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: {
          count: sql`case when ${expired} then 1 else ${rateLimits.count} + 1 end`,
          windowStart: sql`case when ${expired} then now() else ${rateLimits.windowStart} end`,
        },
      })
      .returning({
        count: rateLimits.count,
        windowStart: rateLimits.windowStart,
      });

    if (Math.random() < SWEEP_PROBABILITY) {
      void sweepRateLimits();
    }

    const used = row?.count ?? 1;
    const elapsed = Date.now() - (row?.windowStart?.getTime() ?? Date.now());
    return {
      allowed: used <= policy.limit,
      remaining: Math.max(0, policy.limit - used),
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((windowMs - Math.max(0, elapsed)) / 1000),
      ),
    };
  } catch (error) {
    // FAIL OPEN, deliberately (Vital, Phase 8). This gate exists to raise the
    // cost of abuse; a database blip must not lock every admin out of logging
    // in or stop a family submitting. That is the opposite of the intake kill
    // switch, which fails CLOSED — there, failure should stop new child data
    // arriving. Loud in the log, because a silently absent limiter is exactly
    // the state an attacker wants.
    console.error("consumeRateLimit failed (allowing request):", {
      action,
      error,
    });
    return {
      allowed: true,
      remaining: RATE_LIMITS[action].limit,
      retryAfterSeconds: 0,
    };
  }
}

export async function sweepRateLimits(): Promise<void> {
  try {
    await getDb()
      .delete(rateLimits)
      .where(
        lt(
          rateLimits.windowStart,
          new Date(Date.now() - SWEEP_OLDER_THAN_HOURS * 60 * 60 * 1000),
        ),
      );
  } catch (error) {
    console.error("sweepRateLimits failed:", error);
  }
}
