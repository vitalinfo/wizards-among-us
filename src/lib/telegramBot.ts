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
      // not_configured — no bot token in this environment; nothing was sent.
      // blocked        — 403: the user never allowed the bot, or blocked it.
      // error          — anything else (network, timeout, Telegram 4xx/5xx).
      reason: "not_configured" | "blocked" | "error";
      status?: number;
    };

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
      reason: response.status === 403 ? "blocked" : "error",
      status: response.status,
    };
  } catch {
    // Deliberately not rethrown or logged here: the request URL carries the bot
    // token, and an error object is one careless console.error from printing it.
    return { ok: false, reason: "error" };
  }
}
