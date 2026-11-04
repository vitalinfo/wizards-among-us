import { type NextRequest, NextResponse } from "next/server";

import { afterLoginPath } from "@/lib/auth/returnPath";
import {
  TELEGRAM_NEXT_COOKIE,
  telegramAuthUrl,
  telegramNextCookieOptions,
} from "@/lib/auth/telegramLogin";

// What the "Увійти через Telegram" button links to. Remembers where to land
// afterwards in a cookie, then sends the browser to Telegram's auth page —
// because Telegram fails a first-time login when its return_to carries a query
// string (see telegramAuthUrl), so `next` can't ride along there.
export const dynamic = "force-dynamic";

// The origin the person is on, which Telegram sends them back to. Not
// siteOrigin(): locally that is production's URL. Heroku's router passes the
// public Host through and reports the scheme in x-forwarded-proto, and the
// middleware has already moved the request to the canonical host.
function requestOrigin(request: NextRequest): string {
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${request.headers.get("host")}`;
}

export function GET(request: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const url = botToken
    ? telegramAuthUrl({ botToken, origin: requestOrigin(request) })
    : null;
  if (!url) {
    // Relative, like every redirect in /auth/telegram: request.url is the
    // dyno's internal address behind Heroku's router.
    return new NextResponse(null, {
      status: 302,
      headers: { Location: "/?login=misconfigured" },
    });
  }

  const response = NextResponse.redirect(url, 302);
  response.cookies.set(
    TELEGRAM_NEXT_COOKIE,
    afterLoginPath(request.nextUrl.searchParams.get("next")),
    telegramNextCookieOptions,
  );
  return response;
}
