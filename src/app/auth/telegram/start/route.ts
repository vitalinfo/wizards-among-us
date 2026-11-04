import { type NextRequest, NextResponse } from "next/server";

import { requestOrigin } from "@/lib/auth/requestOrigin";
import { afterLoginPath } from "@/lib/auth/returnPath";
import {
  TELEGRAM_CALLBACK_PATH,
  TELEGRAM_LOGIN_COOKIE,
  encodePendingLogin,
  pkceChallenge,
  randomToken,
  telegramAuthUrl,
  telegramClient,
  telegramLoginCookieOptions,
} from "@/lib/auth/telegramOidc";

// What the "Увійти через Telegram" button links to. Starts an OpenID Connect
// login (see lib/auth/telegramOidc.ts): remembers the state, the PKCE verifier
// and where to land afterwards in a short-lived cookie, then sends the browser
// to Telegram.
export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const client = telegramClient();
  if (!client) {
    // Relative, like every redirect under /auth/telegram: request.url is the
    // dyno's internal address behind Heroku's router.
    return new NextResponse(null, {
      status: 302,
      headers: { Location: "/?login=misconfigured" },
    });
  }

  const state = randomToken();
  const verifier = randomToken();
  const response = NextResponse.redirect(
    telegramAuthUrl({
      clientId: client.clientId,
      redirectUri: requestOrigin(request.headers) + TELEGRAM_CALLBACK_PATH,
      state,
      codeChallenge: pkceChallenge(verifier),
    }),
    302,
  );
  response.cookies.set(
    TELEGRAM_LOGIN_COOKIE,
    encodePendingLogin({
      state,
      verifier,
      next: afterLoginPath(request.nextUrl.searchParams.get("next")),
    }),
    telegramLoginCookieOptions,
  );
  return response;
}
