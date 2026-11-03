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
// JSON>`. A fragment never reaches a server, so the login page reads it and
// forwards it to /auth/telegram, which verifies the signature as before.

const TELEGRAM_AUTH_URL = "https://oauth.telegram.org/auth";

// The bot's numeric id is the part of its token before the colon. It is public
// (Telegram puts it in every widget embed); the secret after the colon never
// leaves this function.
function botIdFromToken(botToken: string): string | null {
  const [id] = botToken.split(":");
  return /^\d+$/.test(id) ? id : null;
}

// Where the "Log in with Telegram" link points. `origin` must be the domain
// set on the bot with BotFather; `returnTo` is an already-validated path to
// land on afterwards, carried through Telegram as /login?next=….
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
  const back = new URL("/login", origin);
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

const AUTH_RESULT = /[#&]tgAuthResult=([A-Za-z0-9_=-]*)$/;

// Turns the fragment Telegram returns with into the /auth/telegram URL that
// signs the person in, or null when there is nothing (valid-looking) to send.
// Nothing here is trusted: the route checks the signature, and re-validates
// `next`.
export function authCallbackFromFragment(
  hash: string,
  search: string,
): string | null {
  const match = AUTH_RESULT.exec(hash);
  if (!match) {
    return null;
  }
  let data: unknown;
  try {
    const base64 = match[1].replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    // UTF-8, not atob's Latin-1: a Cyrillic first name must reach the
    // signature check byte-for-byte as Telegram signed it.
    data = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null || !("hash" in data)) {
    return null;
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    params.set(key, String(value));
  }
  const next = new URLSearchParams(search).get("next");
  if (next) {
    params.set("next", next);
  }
  return `/auth/telegram?${params.toString()}`;
}
