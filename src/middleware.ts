import { type NextRequest, NextResponse } from "next/server";

import { REQUEST_PATH_HEADER } from "@/lib/auth/returnPath";
import { isMaintenanceMode, MAINTENANCE_PATH } from "@/lib/maintenance";
import { SITE } from "@/lib/site";

// Edge-of-app request hygiene: force HTTPS and a single canonical host.
//
// Why this exists: Heroku serves the same app on http:// and https://, and on
// both the herokuapp.com URL and any custom domain. That bit us — signing in
// over http:// silently dropped the session cookie (it's `Secure` in
// production), so login "worked" but the header still showed signed-out. Cookies
// are also scoped per host, so bouncing between herokuapp.com and the custom
// domain looks like being logged out. Both are infrastructure problems; users
// should never have to know.
//
// Heroku terminates TLS at its router, so the dyno always sees a plain HTTP
// request — the original scheme is in `x-forwarded-proto`. Never infer it from
// request.url (that's the internal address; see src/app/auth/telegram/callback/route.ts).

const HSTS_MAX_AGE_SECONDS = 31_536_000; // 1 year

// Only production may be indexed. Staging serves the same build — including the
// landing page's `index, follow` — so without this a crawler that finds it lists
// a second copy of the landing. Decided per request, not per build: the Heroku
// pipeline promotes staging's slug to production unchanged.
const PRODUCTION_HOST = new URL(SITE.url).host;

// The app calling ITSELF. When a server action invoked from the browser ends in
// redirect(), Next renders the target by fetching it from its own server —
// http://localhost:$PORT, carrying the visitor's cookies. Sending that request
// to the canonical host made fetch follow a cross-origin redirect, which drops
// the Cookie header, so the target rendered signed-out and bounced through
// /login: deleting a draft on staging landed on /account/parent (Oct 2026).
//
// Safe to let through: Heroku routes by Host, so an outside request cannot
// reach the dyno addressed to localhost, and a cookie is never at risk on a
// host it was not set for.
const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

function isLoopback(host: string | null): boolean {
  if (!host) {
    return false;
  }
  // Drop the port: "localhost:9652", "[::1]:9652".
  const hostname = host.startsWith("[")
    ? host.slice(0, host.indexOf("]") + 1)
    : host.split(":")[0];
  return LOOPBACK_HOSTNAMES.has(hostname.toLowerCase());
}

// Where a request goes once it is allowed through: to the page it asked for,
// or, in maintenance mode, to the maintenance screen.
//
// On its way it carries the path it asked for, which a layout is otherwise
// never told — the /account layout needs it to send a signed-out deep link to
// /login with the right `next`. `set`, not append: a client-sent header of the
// same name is overwritten. (nextUrl has Next's internal `_rsc` already
// stripped.)
function proceed(request: NextRequest): NextResponse {
  if (!isMaintenanceMode()) {
    const headers = new Headers(request.headers);
    headers.set(
      REQUEST_PATH_HEADER,
      request.nextUrl.pathname + request.nextUrl.search,
    );
    return NextResponse.next({ request: { headers } });
  }
  const url = request.nextUrl.clone();
  url.pathname = MAINTENANCE_PATH;
  url.search = "";
  return NextResponse.rewrite(url, { status: 503 });
}

export function middleware(request: NextRequest): NextResponse {
  // Only in a real deploy: local dev is plain http on localhost, and the tests
  // below cover both branches explicitly.
  if (process.env.NODE_ENV !== "production") {
    return proceed(request);
  }

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("host");
  if (isLoopback(host)) {
    return proceed(request);
  }
  // Optional: set per environment (staging vs production) as a runtime config
  // var. Unset means "whatever host was requested is fine".
  const canonicalHost = process.env.CANONICAL_HOST;

  const isHttps = forwardedProto === null || forwardedProto === "https";
  const isCanonicalHost = !canonicalHost || !host || host === canonicalHost;

  if (!isHttps || !isCanonicalHost) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.port = ""; // the public URL is 443; drop any internal dyno port
    url.host = canonicalHost ?? host ?? url.host;
    // 308 for the scheme upgrade (always correct, safe to cache); 307 for the
    // host move while domains are still being set up — a permanent redirect to
    // a wrong canonical host would stick in browser caches.
    return NextResponse.redirect(url, isHttps ? 307 : 308);
  }

  const response = proceed(request);
  // Tell browsers never to try http again — this is what actually prevents a
  // repeat of the dropped-cookie confusion. No `preload`, and no
  // `includeSubDomains` while we're on a shared *.herokuapp.com host.
  response.headers.set(
    "Strict-Transport-Security",
    `max-age=${HSTS_MAX_AGE_SECONDS}`,
  );
  if (host !== PRODUCTION_HOST) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

export const config = {
  // Skip Next's internals and static assets — nothing to redirect there, and it
  // keeps the middleware off the hot path for every image request.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};
