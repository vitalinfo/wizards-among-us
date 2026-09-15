import { NextIntlClientProvider } from "next-intl";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import messages from "../../../../messages/uk.json";
import { SITE } from "@/lib/site";
import { BecomePartnerCta } from "../BecomePartnerCta";
import { WaysToHelp } from "../WaysToHelp";

describe("BecomePartnerCta", () => {
  // The subject is the point: one shared inbox, told apart by what the sender
  // came for. Losing it turns every partnership enquiry into unsorted mail.
  it("opens a subject-tagged mail to the public address", () => {
    render(
      <NextIntlClientProvider locale="uk" messages={messages}>
        <BecomePartnerCta />
      </NextIntlClientProvider>,
    );

    const href =
      screen
        .getByRole("link", { name: messages.partners.cta })
        .getAttribute("href") ?? "";
    expect(href.startsWith(`mailto:${SITE.email}?subject=`)).toBe(true);
    expect(decodeURIComponent(href.split("subject=")[1])).toBe(
      messages.partners.ctaSubject,
    );
  });
});

describe("WaysToHelp", () => {
  it("renders all four routes in", () => {
    render(
      <NextIntlClientProvider locale="uk" messages={messages}>
        <WaysToHelp />
      </NextIntlClientProvider>,
    );

    for (const way of Object.values(messages.partners.ways.items)) {
      expect(
        screen.getByRole("heading", { name: way.title, level: 3 }),
      ).toBeInTheDocument();
    }
  });

  // The emoji is the design's icon. It must not reach the accessibility tree —
  // "busts in silhouette" read before «Залучити співробітників» is noise.
  it("keeps the emoji out of the accessibility tree", () => {
    const { container } = render(
      <NextIntlClientProvider locale="uk" messages={messages}>
        <WaysToHelp />
      </NextIntlClientProvider>,
    );

    // textContent is the DOM, not the accessibility tree — it reports hidden
    // text too. What matters is that the element carrying the emoji is hidden
    // from assistive tech, and that no list item is NAMED by one.
    for (const emoji of ["👥", "🎁", "🏷️", "🤝"]) {
      const el = screen.getByText(emoji);
      expect(el, `${emoji} is exposed to assistive tech`).toHaveAttribute(
        "aria-hidden",
        "true",
      );
    }
    expect(container.querySelector("li")?.textContent?.[0]).not.toBe("👥");
  });
});
