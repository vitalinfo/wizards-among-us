import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";

import { SITE } from "@/lib/site";

import messages from "../../../../messages/uk.json";
import { decisionMessage, type DecisionTranslator } from "../decision";

const translator = createTranslator({
  locale: "uk",
  messages,
  namespace: "notifications.telegram",
});
const t: DecisionTranslator = (key, values) => translator(key, values);

const ID = "0b6f7d0e-8a4c-4a52-9a43-2f1f6a0e9c11";
const VIEW_URL = `${SITE.url}/account/parent/applications/${ID}/view`;

describe("decisionMessage", () => {
  it("names the child and links to the application on approval", () => {
    const text = decisionMessage(t, "approved", ID, "Марія");

    expect(text).toBe(
      messages.notifications.telegram.approved
        .replace("{childName}", "Марія")
        .replace("{url}", VIEW_URL),
    );
  });

  it("points a rejected family to the application for the reason", () => {
    const text = decisionMessage(t, "rejected", ID, "Марія");

    expect(text).toBe(
      messages.notifications.telegram.rejected
        .replace("{childName}", "Марія")
        .replace("{url}", VIEW_URL),
    );
  });
});
