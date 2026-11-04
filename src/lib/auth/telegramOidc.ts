import { createHash, randomBytes } from "node:crypto";

import { type JWTVerifyGetKey, createRemoteJWKSet, jwtVerify } from "jose";

import type { TelegramProfile } from "./telegram";

// Telegram login over OpenID Connect: authorization code flow with PKCE
// (https://core.telegram.org/widgets/login, discovery at
// https://oauth.telegram.org/.well-known/openid-configuration).
//
// Why this and not the legacy Login Widget. The widget's popup lost the result
// on phones, and its same-tab variant (`bot_id` + `return_to`, the result in a
// `#tgAuthResult` fragment) answered a person's FIRST accept with
// `tgAuthResult=false` — Telegram told them they were logged in while our site
// got nothing (staging + prod, Nov 2026). BotFather now calls that widget
// "legacy" and offers this flow instead. Here Telegram sends a one-time `code`
// to our callback in the QUERY string, and the server exchanges it, with the
// client secret, for a signed ID token. Nothing runs in the browser.
//
// Bot setup (BotFather → bot → Login Widget → Switch to OpenID Connect Login):
// register the callback URL below as a redirect URL. The client id is the
// bot's numeric id; the client secret is shown there.

export const TELEGRAM_ISSUER = "https://oauth.telegram.org";
const AUTH_URL = `${TELEGRAM_ISSUER}/auth`;
const TOKEN_URL = `${TELEGRAM_ISSUER}/token`;
const JWKS = createRemoteJWKSet(
  new URL(`${TELEGRAM_ISSUER}/.well-known/jwks.json`),
);

export const TELEGRAM_CALLBACK_PATH = "/auth/telegram/callback";

// `profile` carries the numeric Telegram id our identities are keyed by, plus
// name, @username and photo. `telegram:bot_access` lets our bot message the
// person — what the widget's request_access=write asked for.
const SCOPE = "openid profile telegram:bot_access";

export type TelegramClient = { clientId: string; clientSecret: string };

export function telegramClient(): TelegramClient | null {
  const clientId = process.env.TELEGRAM_CLIENT_ID;
  const clientSecret = process.env.TELEGRAM_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

// 32 random bytes, base64url: the `state` and the PKCE verifier.
export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

// RFC 7636 S256: base64url(SHA-256(verifier)).
export function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function telegramAuthUrl({
  clientId,
  redirectUri,
  state,
  codeChallenge,
}: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const url = new URL(AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPE);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

// Trades the one-time code for the ID token. Basic auth with the client secret,
// which never leaves the server.
export async function exchangeCode({
  client,
  code,
  codeVerifier,
  redirectUri,
}: {
  client: TelegramClient;
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<string> {
  const basic = Buffer.from(
    `${client.clientId}:${client.clientSecret}`,
  ).toString("base64");
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: client.clientId,
      code_verifier: codeVerifier,
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Telegram token endpoint answered ${response.status}`);
  }
  const body: unknown = await response.json();
  const idToken =
    body && typeof body === "object" && "id_token" in body
      ? body.id_token
      : undefined;
  if (typeof idToken !== "string") {
    throw new Error("Telegram token response has no id_token");
  }
  return idToken;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

// Verifies the ID token (signature against Telegram's published keys, issuer,
// audience = our bot, expiry) and maps it to the profile the rest of login
// already uses.
//
// The identity key is the `id` claim — the numeric Telegram user id every
// existing `identities` row holds — NOT `sub`, which Telegram documents as a
// different, opaque value. A token without a numeric `id` is refused rather
// than keyed on anything else: guessing would give every existing person a
// second, empty account.
export async function profileFromIdToken(
  idToken: string,
  clientId: string,
  keys: JWTVerifyGetKey = JWKS,
): Promise<TelegramProfile> {
  const { payload } = await jwtVerify(idToken, keys, {
    issuer: TELEGRAM_ISSUER,
    audience: clientId,
  });

  const id =
    typeof payload.id === "number" && Number.isSafeInteger(payload.id)
      ? String(payload.id)
      : typeof payload.id === "string" && /^\d+$/.test(payload.id)
        ? payload.id
        : null;
  if (!id) {
    // Claim NAMES only — the values are personal data.
    throw new Error(
      `Telegram ID token has no numeric id (claims: ${Object.keys(payload).join(", ")})`,
    );
  }

  const firstName =
    optionalString(payload.given_name) ?? optionalString(payload.name);
  if (!firstName) {
    throw new Error("Telegram ID token has no name");
  }

  return {
    id,
    firstName,
    lastName: optionalString(payload.family_name),
    username: optionalString(payload.preferred_username),
    photoUrl: optionalString(payload.picture),
    authDate: payload.iat ?? Math.floor(Date.now() / 1000),
  };
}

// What /auth/telegram/start hands /auth/telegram/callback: the state to match,
// the PKCE verifier, and the already-validated path to land on. Scoped to
// /auth/telegram so no other request carries it; ten minutes covers a person
// switching to the Telegram app and back. Lax is enough — the return from
// Telegram is a top-level GET.
export const TELEGRAM_LOGIN_COOKIE = "tg_login";

export const telegramLoginCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/auth/telegram",
  maxAge: 600,
};

export type PendingLogin = { state: string; verifier: string; next: string };

export function encodePendingLogin(pending: PendingLogin): string {
  return Buffer.from(JSON.stringify(pending)).toString("base64url");
}

// A cookie is client input: anything that isn't exactly the shape we wrote is
// treated as no login in progress. `next` is re-validated by the caller.
export function decodePendingLogin(
  value: string | undefined,
): PendingLogin | null {
  if (!value) {
    return null;
  }
  try {
    const data: unknown = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    );
    if (
      data &&
      typeof data === "object" &&
      "state" in data &&
      "verifier" in data &&
      "next" in data &&
      typeof data.state === "string" &&
      typeof data.verifier === "string" &&
      typeof data.next === "string"
    ) {
      return { state: data.state, verifier: data.verifier, next: data.next };
    }
  } catch {}
  return null;
}
