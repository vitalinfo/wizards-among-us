import { NextIntlClientProvider } from "next-intl";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);
// All three are database lookups; what is under test is what the page draws
// for a parent who is allowed to start an application.
const session = vi.hoisted(() => ({ actor: null as unknown }));
vi.mock("@/lib/auth/session", () => ({
  getSessionActor: async () => session.actor,
}));
const campaign = vi.hoisted(() => ({ row: null as unknown }));
vi.mock("@/features/campaigns/queries", () => ({
  getActiveCampaignForIntake: async () => campaign.row,
}));
vi.mock("@/features/settings/queries", () => ({
  getResolvedSettings: async () => ({ applicationsEnabled: true }),
}));
vi.mock("@/app/account/(shell)/parent/applications/actions", () => ({
  startApplication: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));

import messages from "../../../../../../../../messages/uk.json";
import { locale } from "@/i18n/config";
import { axe } from "@/test/axe";

import BriefingPage from "../page";

const t = messages.parent.briefing;
const items = t.saint_nicholas_day.items;

async function renderPage() {
  session.actor = {
    kind: "user",
    id: "u1",
    username: "olena",
    firstName: "Олена",
    roles: ["parent"],
  };
  campaign.row = {
    id: "c1",
    title: "Святий Миколай 2025",
    type: "saint_nicholas_day",
    status: "active",
    acceptingApplications: true,
    giftPriceCap: "699.00",
    endsAt: null,
  };
  const ui = await BriefingPage();
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("«Перед заповненням анкети»", () => {
  // The ten points are a list in the design and a list in the markup: a parent
  // on a screen reader is told how much there is to read before they start.
  it("is a list of every point, each in its own item", async () => {
    await renderPage();

    // The first list in the document is the outer one; the «До анкети
    // потрібно буде додати:» bullets are a list of their own nested inside it,
    // so count only the outer list's own children.
    const [points] = screen.getAllByRole("list");
    expect(points.children).toHaveLength(items.length);
    // Item 1 is the one with no placeholders in it, so it can be asserted
    // against the message file verbatim.
    expect(
      within(points.children[1] as HTMLElement).getByText(items[1].title),
    ).toBeInTheDocument();
  });

  it("prints the campaign's cap rather than a number in the copy", async () => {
    await renderPage();

    expect(screen.getAllByText(/699 грн/).length).toBeGreaterThan(0);
  });

  it("offers the form that creates the draft as a submit, not a link", async () => {
    await renderPage();

    const start = screen.getByRole("button", { name: t.cta });
    expect(start.closest("form")).not.toBeNull();
  });

  it("has no accessibility violations", async () => {
    const { container } = await renderPage();

    expect(await axe(container)).toHaveNoViolations();
  });
});
