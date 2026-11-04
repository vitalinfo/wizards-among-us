import { type NextRequest, NextResponse } from "next/server";

import {
  SESSION_COOKIE_NAME,
  createSessionRecord,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { requestOrigin } from "@/lib/auth/requestOrigin";
import { afterLoginPath } from "@/lib/auth/returnPath";
import {
  TELEGRAM_CALLBACK_PATH,
  TELEGRAM_LOGIN_COOKIE,
  decodePendingLogin,
  exchangeCode,
  profileFromIdToken,
  telegramClient,
  telegramLoginCookieOptions,
} from "@/lib/auth/telegramOidc";
import { findOrCreateTelegramUser } from "@/lib/auth/telegramUser";

// Where Telegram sends the person back: `?code=…&state=…` on success,
// `?error=…` when they decline. Check the state against the cookie /start set →
// exchange the code → verify the ID token → find-or-create the user → session.
// The cookies are set on the redirect response (cookies() mutations don't
// attach to a custom NextResponse).
export const dynamic = "force-dynamic";

// Redirect with a RELATIVE Location, resolved by the browser against the URL it
// actually requested.
//
// Do NOT use NextResponse.redirect(new URL(path, request.url)): behind a reverse
// proxy (Heroku's router, and most PaaS) `request.url` is the dyno's internal
// address, so that produced a real redirect to `localhost:<PORT>` in staging —
// login appeared to "do nothing". A relative Location needs no host detection
// and is correct on every host, proxied or not.
//
// Every exit also drops the login cookie: it was for this one attempt.
function redirectTo(path: string): NextResponse {
  const response = new NextResponse(null, {
    status: 302,
    headers: { Location: path },
  });
  response.cookies.set(TELEGRAM_LOGIN_COOKIE, "", {
    ...telegramLoginCookieOptions,
    maxAge: 0,
  });
  return response;
}

export async function GET(request: NextRequest) {
  const client = telegramClient();
  if (!client) {
    return redirectTo("/?login=misconfigured");
  }

  const query = request.nextUrl.searchParams;
  const pending = decodePendingLogin(
    request.cookies.get(TELEGRAM_LOGIN_COOKIE)?.value,
  );
  if (!pending) {
    // Expired or never started here: nothing to finish, so start over.
    return redirectTo("/login");
  }
  // Re-validated: the cookie came back from the browser.
  const returnTo = afterLoginPath(pending.next);

  if (query.get("error")) {
    // Declined in Telegram — back to the login page, still headed where they
    // were going.
    return redirectTo(`/login?next=${encodeURIComponent(returnTo)}`);
  }
  const code = query.get("code");
  if (!code || query.get("state") !== pending.state) {
    return redirectTo("/?login=failed");
  }

  let profile;
  try {
    const idToken = await exchangeCode({
      client,
      code,
      codeVerifier: pending.verifier,
      redirectUri: requestOrigin(request.headers) + TELEGRAM_CALLBACK_PATH,
    });
    profile = await profileFromIdToken(idToken, client.clientId);
  } catch (error) {
    // The message never carries claim values — see profileFromIdToken.
    console.error(
      "Telegram login failed:",
      error instanceof Error ? error.message : error,
    );
    return redirectTo("/?login=failed");
  }

  const userId = await findOrCreateTelegramUser(profile);
  const { token, expiresAt } = await createSessionRecord({
    actorType: "user",
    actorId: userId,
  });

  const response = redirectTo(returnTo);
  response.cookies.set(
    SESSION_COOKIE_NAME,
    token,
    sessionCookieOptions(expiresAt),
  );
  return response;
}
