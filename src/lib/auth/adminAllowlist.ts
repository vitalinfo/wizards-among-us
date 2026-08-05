// Admin access is gated by ADMIN_ALLOWLIST (comma-separated emails). Only these
// emails may sign in / self-provision as an admin on first login (plan §4).

export function parseAdminAllowlist(
  raw: string | null | undefined,
): Set<string> {
  if (!raw) {
    return new Set();
  }
  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0),
  );
}

export function isAdminEmailAllowed(email: string): boolean {
  return parseAdminAllowlist(process.env.ADMIN_ALLOWLIST).has(
    email.trim().toLowerCase(),
  );
}
