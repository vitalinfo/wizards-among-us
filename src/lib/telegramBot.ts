// Outbound Telegram Bot API: the bot writing TO a user, by their numeric id.
//
// It only works for someone who let the bot message them — the Login Widget
// asks with `data-request-access="write"`, and the user can untick it or block
// the bot later. Telegram does not tell us which at login, so a refusal is only
// discovered here, as a 403. Callers must therefore treat a send as best
// effort: nothing in the app may depend on the message having arrived.

export type TelegramSendResult =
  | { ok: true }
  | {
      ok: false;
      reason: TelegramFailure;
      status?: number;
    };

// Why a send failed — logged as the audit detail, so each is a fixed code the
// log can name and filter on (admin.audit.actionDetails.notification). Split by
// what a retry could change:
//   not_configured — no bot token in this environment; nothing was sent.
//   blocked        — 403: the user never allowed the bot, or blocked it.
//   bad_request    — 400: Telegram refused this chat (e.g. it doesn't exist).
//   rejected       — any other 4xx but 429 (a bad token is a 401/404).
//   rate_limited   — 429: too many messages; Telegram says when to try again.
//   server_error   — 5xx: Telegram's side.
//   timeout        — no answer within timeoutMs. The message MAY have been
//                    delivered — a retry could send it twice.
//   network        — the request failed before any answer (DNS, connection).
//   error          — anything else (an unexpected status). Rows logged before
//                    the split carry it for every one of the above but blocked.
export type TelegramFailure =
  | "not_configured"
  | "blocked"
  | "bad_request"
  | "rejected"
  | "rate_limited"
  | "server_error"
  | "timeout"
  | "network"
  | "error";

export function failureForStatus(status: number): TelegramFailure {
  if (status === 403) {
    return "blocked";
  }
  if (status === 429) {
    return "rate_limited";
  }
  if (status === 400) {
    return "bad_request";
  }
  if (status >= 500) {
    return "server_error";
  }
  if (status >= 400) {
    return "rejected";
  }
  return "error";
}

type SendOptions = {
  botToken?: string;
  fetchImpl?: typeof fetch; // injectable for tests
  timeoutMs?: number;
};

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  {
    botToken = process.env.TELEGRAM_BOT_TOKEN,
    fetchImpl = fetch,
    timeoutMs = 5_000,
  }: SendOptions = {},
): Promise<TelegramSendResult> {
  if (!botToken) {
    return { ok: false, reason: "not_configured" };
  }

  try {
    const response = await fetchImpl(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          // A preview card of our own login page adds nothing.
          link_preview_options: { is_disabled: true },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      },
    );
    if (response.ok) {
      return { ok: true };
    }
    return {
      ok: false,
      reason: failureForStatus(response.status),
      status: response.status,
    };
  } catch (err) {
    // Deliberately not rethrown or logged here: the request URL carries the bot
    // token, and an error object is one careless console.error from printing it.
    // Only its name is read — AbortSignal.timeout() aborts with a TimeoutError.
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return { ok: false, reason: timedOut ? "timeout" : "network" };
  }
}
