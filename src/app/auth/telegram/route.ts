import { type NextRequest, NextResponse } from "next/server";

import {
  SESSION_COOKIE_NAME,
  createSessionRecord,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { safeReturnPath } from "@/lib/auth/returnPath";
import { verifyTelegramLogin } from "@/lib/auth/telegram";
import { findOrCreateTelegramUser } from "@/lib/auth/telegramUser";

// Telegram Login Widget callback (redirect mode): Telegram sends the signed auth
// data as query params. Verify → find-or-create user → session → redirect home.
// The cookie is set on the redirect response (cookies() mutations don't attach
// to a custom NextResponse).
export const dynamic = "force-dynamic";

// Redirect with a RELATIVE Location, resolved by the browser against the URL it
// actually requested.
//
// Do NOT use NextResponse.redirect(new URL(path, request.url)): behind a reverse
// proxy (Heroku's router, and most PaaS) `request.url` is the dyno's internal
// address, so that produced a real redirect to `localhost:<PORT>` in staging —
// login appeared to "do nothing". A relative Location needs no host detection
// and is correct on every host, proxied or not.
function redirectTo(path: string): NextResponse {
  return new NextResponse(null, { status: 302, headers: { Location: path } });
}

export async function GET(request: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return redirectTo("/?login=misconfigured");
  }

  const params = Object.fromEntries(request.nextUrl.searchParams);
  // `next` is ours, not Telegram's — it must NOT take part in the signature
  // check, and it is re-validated because it round-tripped through a third
  // party and the browser.
  const { next, ...signed } = params;
  const returnTo = safeReturnPath(next);
  const result = verifyTelegramLogin(signed, botToken);
  if (!result.ok) {
    return redirectTo("/?login=failed");
  }

  const userId = await findOrCreateTelegramUser(result.profile);
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
