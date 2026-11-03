import { createTranslator } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SITE } from "@/lib/site";

import messages from "../../../../messages/uk.json";
import { noticeMessage, type NoticeTranslator } from "../telegram";

const translator = createTranslator({
  locale: "uk",
  messages,
  namespace: "notifications.telegram",
});
const t: NoticeTranslator = (key, values) => translator(key, values);

const ID = "0b6f7d0e-8a4c-4a52-9a43-2f1f6a0e9c11";
const VIEW_URL = `${SITE.url}/account/parent/applications/${ID}/view`;

describe("noticeMessage", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("names the child and links to the application on approval", () => {
    const text = noticeMessage(t, "approved", ID, "Марія");

    expect(text).toBe(
      messages.notifications.telegram.approved
        .replace("{childName}", "Марія")
        .replace("{url}", VIEW_URL),
    );
  });

  it("points a rejected family to the application for the reason", () => {
    const text = noticeMessage(t, "rejected", ID, "Марія");

    expect(text).toBe(
      messages.notifications.telegram.rejected
        .replace("{childName}", "Марія")
        .replace("{url}", VIEW_URL),
    );
  });

  it("links to this deploy's canonical host when one is set", () => {
    vi.stubEnv("CANONICAL_HOST", "staging.wizards-among-us.pp.ua");

    expect(noticeMessage(t, "approved", ID, "Марія")).toContain(
      `https://staging.wizards-among-us.pp.ua/account/parent/applications/${ID}/view`,
    );
  });

  it("sends the parent of a claimed child to «Мої Чарівники»", () => {
    const text = noticeMessage(t, "claimed", ID, "Марія");

    expect(text).toBe(
      messages.notifications.telegram.claimed
        .replace("{childName}", "Марія")
        .replace("{url}", `${SITE.url}/account/parent/my-volunteer`),
    );
  });

  it("sends the volunteer of a fulfilled wish to their claims", () => {
    const text = noticeMessage(t, "fulfilled", ID, "Марія");

    expect(text).toBe(
      messages.notifications.telegram.fulfilled
        .replace("{childName}", "Марія")
        .replace("{url}", `${SITE.url}/account/volunteer/claims`),
    );
  });
});
