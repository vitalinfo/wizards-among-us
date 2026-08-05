import { type NextRequest, NextResponse } from "next/server";

import {
  SESSION_COOKIE_NAME,
  createSessionRecord,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { verifyTelegramLogin } from "@/lib/auth/telegram";
import { findOrCreateTelegramUser } from "@/lib/auth/telegramUser";

// Telegram Login Widget callback (redirect mode): Telegram sends the signed auth
// data as query params. Verify → find-or-create user → session → redirect home.
// The cookie is set on the redirect response (cookies() mutations don't attach
// to a custom NextResponse).
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.redirect(new URL("/?login=misconfigured", request.url));
  }

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const result = verifyTelegramLogin(params, botToken);
  if (!result.ok) {
    return NextResponse.redirect(new URL("/?login=failed", request.url));
  }

  const userId = await findOrCreateTelegramUser(result.profile);
  const { token, expiresAt } = await createSessionRecord({
    actorType: "user",
    actorId: userId,
  });

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set(
    SESSION_COOKIE_NAME,
    token,
    sessionCookieOptions(expiresAt),
  );
  return response;
}
