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

// Where a sign-in lands: the page it was sent from, or else the account — not
// the home page, which is safeReturnPath's fallback for every other use.
export function afterLoginPath(value: string | null | undefined): string {
  const safe = safeReturnPath(value);
  return safe === FALLBACK ? "/account" : safe;
}

// Build the sign-in URL for a protected page, so a user returns to what they
// were trying to reach instead of being dropped on the home page.
export function loginPathFor(returnTo: string): string {
  const safe = safeReturnPath(returnTo);
  return safe === FALLBACK
    ? "/login"
    : `/login?next=${encodeURIComponent(safe)}`;
}

// The request header carrying the path (and query) the visitor asked for. Set
// by the middleware on every request it sees, overwriting anything the client
// sent under the same name; read by the /account layout, which — being a
// layout — is not told the url it is rendering for.
export const REQUEST_PATH_HEADER = "x-request-path";

const ACCOUNT_ROOT = "/account";

// Where the /account layout's sign-in should return to: the deep link the
// visitor opened (a bot notification's «переглянути заявку», say), not the
// account's front page.
//
// Only a path under /account is taken. The layout only ever renders for one, so
// anything else means the header is missing (a route the middleware matcher
// skips) or was not set by us — and the account root is the honest answer to
// both. The result still goes through loginPathFor → safeReturnPath.
export function accountReturnPath(value: string | null | undefined): string {
  if (
    value === ACCOUNT_ROOT ||
    value?.startsWith(`${ACCOUNT_ROOT}/`) ||
    value?.startsWith(`${ACCOUNT_ROOT}?`)
  ) {
    return value;
  }
  return ACCOUNT_ROOT;
}

// Where to send an actor that reached a parent/volunteer page without being a
// signed-in USER.
//
// The admin case is the reason this exists. An admin holds a session but is not
// a `user` — admins live in their own table and never appear as a parent_id —
// so a page guarded with `isUser` bounces them to /login, and /login (which
// only asked "is there an actor?") bounced them straight back. That is an
// infinite redirect loop, and we shipped it: an admin opening
// /account/parent/applications spun forever.
//
// Admins have their own surface, so send them there instead of to a sign-in
// page they are already past.
export function signedOutRedirect(
  actor: { kind: "user" | "admin" } | null | undefined,
  returnTo: string,
): string {
  return actor?.kind === "admin" ? "/admin" : loginPathFor(returnTo);
}
