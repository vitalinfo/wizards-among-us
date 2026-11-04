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

// Where the "Log in with Telegram" link points. `origin` must be the domain
// set on the bot with BotFather; `returnTo` is an already-validated path to
// land on afterwards, carried through Telegram as
// /auth/telegram/return?next=….
export function telegramAuthUrl({
  botToken,
  origin,
  returnTo,
}: {
  botToken: string;
  origin: string;
  returnTo: string;
}): string | null {
  const botId = botIdFromToken(botToken);
  if (!botId) {
    return null;
  }
  const back = new URL(TELEGRAM_RETURN_PATH, origin);
  if (returnTo !== "/") {
    back.searchParams.set("next", returnTo);
  }
  const url = new URL(TELEGRAM_AUTH_URL);
  url.searchParams.set("bot_id", botId);
  url.searchParams.set("origin", origin);
  // Lets our bot message the person — the same permission the widget asked for.
  url.searchParams.set("request_access", "write");
  url.searchParams.set("return_to", back.toString());
  return url.toString();
}
