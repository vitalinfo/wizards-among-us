// Telegram login as a full-page round trip, without Telegram's Login Widget.
//
// The widget renders a third-party iframe that opens a popup, and gets the
// result back either by a message from that popup or by reading a cookie
// inside the iframe. On phones neither is reliable: the popup is a tab, the
// person leaves for the Telegram app to accept, the browser suspends our tab,
// and Safari blocks the iframe's cookie. Telegram reported a successful login
// while our server never heard of it (staging, Nov 2026, iPhone Safari and
// Android Chrome).
//
// Sending the browser to Telegram's auth page in the SAME tab avoids all of
// that: with no popup to report to, Telegram sends the person back to
// `return_to` with the signed data in the fragment, `#tgAuthResult=<base64url
// JSON>`. A fragment never reaches a server, so /auth/telegram/return reads it
// and forwards it to /auth/telegram, which verifies the signature as before
// (see telegramReturnScript.ts).

const TELEGRAM_AUTH_URL = "https://oauth.telegram.org/auth";
const TELEGRAM_RETURN_PATH = "/auth/telegram/return";

// The bot's numeric id is the part of its token before the colon. It is public
// (Telegram puts it in every widget embed); the secret after the colon never
// leaves this function.
function botIdFromToken(botToken: string): string | null {
  const [id] = botToken.split(":");
  return /^\d+$/.test(id) ? id : null;
}

// Where /auth/telegram/start sends the browser. `origin` must be the domain
// set on the bot with BotFather.
//
// `return_to` carries NO query string. On the FIRST accept for a bot (a new
// user, or anyone who disconnected the site in Telegram), Telegram returns
// `#tgAuthResult=false` instead of the signed data when return_to has one —
// and the person sees "you have successfully logged in" in Telegram while our
// site never hears of it. Repeat logins were unaffected, which is why it only
// hit brand-new users (staging + prod, Nov 2026, reproduced by hand: the same
// return_to with and without `?next=`). So the return path travels in a
// cookie instead — see TELEGRAM_NEXT_COOKIE.
export function telegramAuthUrl({
  botToken,
  origin,
}: {
  botToken: string;
  origin: string;
}): string | null {
  const botId = botIdFromToken(botToken);
  if (!botId) {
    return null;
  }
  const url = new URL(TELEGRAM_AUTH_URL);
  url.searchParams.set("bot_id", botId);
  url.searchParams.set("origin", origin);
  // Lets our bot message the person — the same permission the widget asked for.
  url.searchParams.set("request_access", "write");
  url.searchParams.set(
    "return_to",
    new URL(TELEGRAM_RETURN_PATH, origin).toString(),
  );
  return url.toString();
}

// Holds the already-validated path to land on after login, from
// /auth/telegram/start until /auth/telegram reads it (and re-validates it: a
// cookie is client input too). Scoped to /auth/telegram so no other request
// carries it; ten minutes covers a person switching to the Telegram app and
// back. Lax is enough — the return from Telegram is a top-level GET.
export const TELEGRAM_NEXT_COOKIE = "tg_next";

export const telegramNextCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/auth/telegram",
  maxAge: 600,
};
