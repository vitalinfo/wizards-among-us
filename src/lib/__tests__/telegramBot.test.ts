import { describe, expect, it, vi } from "vitest";

import { sendTelegramMessage } from "../telegramBot";

const respond = (status: number) =>
  vi.fn<typeof fetch>(async () => new Response("{}", { status }));

describe("sendTelegramMessage", () => {
  it("posts the text to the chat through the bot's sendMessage", async () => {
    const fetchImpl = respond(200);

    const result = await sendTelegramMessage("12345", "Привіт", {
      botToken: "TOKEN",
      fetchImpl,
    });

    expect(result).toEqual({ ok: true });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.telegram.org/botTOKEN/sendMessage");
    expect(JSON.parse(init?.body as string)).toMatchObject({
      chat_id: "12345",
      text: "Привіт",
    });
  });

  it("sends nothing when the environment has no bot token", async () => {
    const fetchImpl = respond(200);

    const result = await sendTelegramMessage("12345", "Привіт", {
      botToken: "",
      fetchImpl,
    });

    expect(result).toEqual({ ok: false, reason: "not_configured" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reports a user who never allowed (or blocked) the bot as blocked", async () => {
    const result = await sendTelegramMessage("12345", "Привіт", {
      botToken: "TOKEN",
      fetchImpl: respond(403),
    });

    expect(result).toEqual({ ok: false, reason: "blocked", status: 403 });
  });

  // Split by what a retry could change, so the trail can say which failures
  // were worth another attempt.
  it("names every other refusal by its status", async () => {
    for (const [status, reason] of [
      [400, "bad_request"],
      [401, "rejected"],
      [404, "rejected"],
      [429, "rate_limited"],
      [500, "server_error"],
      [502, "server_error"],
      [302, "error"],
    ] as const) {
      const result = await sendTelegramMessage("12345", "Привіт", {
        botToken: "TOKEN",
        fetchImpl: respond(status),
      });
      expect(result).toEqual({ ok: false, reason, status });
    }
  });

  it("swallows a network failure instead of throwing", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      throw new TypeError("fetch failed");
    });

    const result = await sendTelegramMessage("12345", "Привіт", {
      botToken: "TOKEN",
      fetchImpl,
    });

    expect(result).toEqual({ ok: false, reason: "network" });
  });

  // The real abort, not a hand-made error: what AbortSignal.timeout() throws
  // is what has to be recognised. A timeout is its own reason because the
  // message may have arrived anyway.
  it("tells a timeout from a network failure", async () => {
    const fetchImpl = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(init.signal?.reason),
          );
        }),
    );

    const result = await sendTelegramMessage("12345", "Привіт", {
      botToken: "TOKEN",
      fetchImpl,
      timeoutMs: 1,
    });

    expect(result).toEqual({ ok: false, reason: "timeout" });
  });
});
