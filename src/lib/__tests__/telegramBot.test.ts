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

  it("reports any other Telegram refusal as an error", async () => {
    const result = await sendTelegramMessage("12345", "Привіт", {
      botToken: "TOKEN",
      fetchImpl: respond(400),
    });

    expect(result).toEqual({ ok: false, reason: "error", status: 400 });
  });

  it("swallows a network failure instead of throwing", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      throw new TypeError("fetch failed");
    });

    const result = await sendTelegramMessage("12345", "Привіт", {
      botToken: "TOKEN",
      fetchImpl,
    });

    expect(result).toEqual({ ok: false, reason: "error" });
  });
});
