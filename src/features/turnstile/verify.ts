// Server-side verification of a Turnstile token (the captcha on the parent
// form). The widget in the browser only produces a token; it proves nothing
// until Cloudflare confirms it here — a client that skips the widget entirely
// simply sends no token, which must fail.

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileResult =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "missing_token" | "rejected" };

export function turnstileSiteKey(): string | null {
  return process.env.TURNSTILE_SITE_KEY ?? null;
}

// Absent config means the captcha can't run. We FAIL CLOSED on a deployed
// environment: a misconfigured secret must not silently disable the only
// spam defence on a public form. Locally (no NODE_ENV=production) we allow it
// through, so a fresh checkout without keys still works.
function allowWhenUnconfigured(): boolean {
  return process.env.NODE_ENV !== "production";
}

export async function verifyTurnstile(
  token: string | null | undefined,
  remoteIp?: string | null,
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return allowWhenUnconfigured()
      ? { ok: true }
      : { ok: false, reason: "not_configured" };
  }
  if (!token) {
    return { ok: false, reason: "missing_token" };
  }

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) {
    body.set("remoteip", remoteIp);
  }

  try {
    const response = await fetch(VERIFY_URL, { method: "POST", body });
    const payload = (await response.json()) as { success?: boolean };
    return payload.success === true
      ? { ok: true }
      : { ok: false, reason: "rejected" };
  } catch (error) {
    // Cloudflare unreachable. Fail CLOSED rather than waving traffic through
    // on a network blip — the parent can retry, and a submit is not urgent to
    // the second.
    console.error("verifyTurnstile failed:", error);
    return { ok: false, reason: "rejected" };
  }
}
