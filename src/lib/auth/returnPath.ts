// Where to send someone after they sign in.
//
// This value arrives from a query string, so it is attacker-controlled. An
// unvalidated redirect target is an OPEN REDIRECT — and the moment right after
// authenticating is exactly when a user is least likely to notice being bounced
// to a look-alike site. So: same-origin relative paths only, everything else
// falls back to the home page.
const FALLBACK = "/";

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

export function safeReturnPath(value: string | null | undefined): string {
  if (!value) {
    return FALLBACK;
  }

  // Must be a single-slash absolute path. Rejects:
  //   https://evil.com  — absolute URL
  //   //evil.com        — protocol-relative; browsers treat this as absolute
  //   /\evil.com        — backslash variant some parsers normalise
  //   javascript:...    — scheme
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/\\")
  ) {
    return FALLBACK;
  }

  // A newline or control character could smuggle a second header.
  if (CONTROL_CHARS.test(value)) {
    return FALLBACK;
  }

  // Never bounce back into the auth routes themselves — that would loop.
  if (value.startsWith("/login") || value.startsWith("/auth/")) {
    return FALLBACK;
  }

  return value;
}

// Build the sign-in URL for a protected page, so a user returns to what they
// were trying to reach instead of being dropped on the home page.
export function loginPathFor(returnTo: string): string {
  const safe = safeReturnPath(returnTo);
  return safe === FALLBACK
    ? "/login"
    : `/login?next=${encodeURIComponent(safe)}`;
}

// Where to send an actor that reached a parent/volunteer page without being a
// signed-in USER.
//
// The admin case is the reason this exists. An admin holds a session but is not
// a `user` — admins live in their own table and never appear as a parent_id —
// so a page guarded with `isUser` bounces them to /login, and /login (which
// only asked "is there an actor?") bounced them straight back. That is an
// infinite redirect loop, and we shipped it: an admin opening
// /parent/applications spun forever.
//
// Admins have their own surface, so send them there instead of to a sign-in
// page they are already past.
export function signedOutRedirect(
  actor: { kind: "user" | "admin" } | null | undefined,
  returnTo: string,
): string {
  return actor?.kind === "admin" ? "/admin" : loginPathFor(returnTo);
}
