// Rate-limit policies: what is gated, how hard, and for how long.
//
// Pure data + key construction, no database — so the limits are testable and
// reviewable in one place rather than scattered across call sites.

export type RateLimitPolicy = {
  // Attempts allowed inside one window.
  limit: number;
  windowSeconds: number;
};

// The three actions worth protecting, and why each number is what it is.
export const RATE_LIMITS = {
  // The only password in the system. Tight, because the whole point is to make
  // guessing impractical; a real admin who fatfingers it five times can wait a
  // quarter of an hour.
  adminLogin: { limit: 5, windowSeconds: 15 * 60 },

  // Every submission is a child record a human must read and decide on within
  // two days. A script could bury real families in junk and make that promise
  // impossible to keep. Generous enough that a parent filing for three children
  // in one sitting never notices.
  applicationSubmit: { limit: 10, windowSeconds: 60 * 60 },

  // Someone could otherwise grab every available child faster than real
  // volunteers can read a card. Well above any honest pace.
  claim: { limit: 20, windowSeconds: 60 * 60 },
} as const satisfies Record<string, RateLimitPolicy>;

export type RateLimitAction = keyof typeof RATE_LIMITS;

// The counter key: action + who. One table serves every gate.
//
// Identifiers are scoped by KIND ("ip" / "user") so a user id can never collide
// with an address, and the action prefix keeps a login attempt from consuming a
// submit allowance.
export function rateLimitKey(
  action: RateLimitAction,
  identifier: { kind: "ip" | "user"; value: string },
): string {
  return `${action}:${identifier.kind}:${identifier.value}`;
}

// The client address, from Heroku's proxy headers.
//
// Heroku terminates TLS at its router, so the dyno never sees the real peer —
// x-forwarded-for carries it. We take the LAST entry: the router APPENDS the
// address it saw to whatever the client sent, so everything before it is the
// client's own text. Checked on staging, 2026-11-03: a request sent with
// `X-Forwarded-For: 198.51.100.77` was logged as
// `fwd="198.51.100.77, <our real address>"`. (This used to take the first
// entry, which let any caller name its own address — past the login rate limit,
// and into the audit trail.)
//
// The router is our only proxy (DNS is at NIC.UA, no CDN in front), so the last
// entry is its. Put a proxy in front and this has to change with it.
export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  const last = forwarded?.split(",").at(-1)?.trim();
  return last && last.length > 0 ? last : null;
}
