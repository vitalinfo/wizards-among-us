import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StateEvent } from "@/features/campaigns/analytics";
import { axe } from "@/test/axe";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);
const data = vi.hoisted(() => ({
  actor: { kind: "admin", id: "a1", email: "admin@example.com" } as unknown,
  events: [] as StateEvent[],
}));
vi.mock("@/lib/auth/session", () => ({
  getSessionActor: async () => data.actor,
}));
// The campaign and the events are database reads; what is under test is how
// the page draws them.
vi.mock("@/features/campaigns/adminQueries", () => ({
  getAdminCampaign: async (id: string) => ({
    id,
    title: "Святий Миколай 2026",
    status: "archived",
  }),
}));
vi.mock("@/features/campaigns/analyticsQueries", () => ({
  listCampaignStateEvents: async () => data.events,
}));
vi.mock("@/components/admin/AdminNav", () => ({ AdminNav: () => null }));
const redirect = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
);
vi.mock("next/navigation", () => ({
  redirect,
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

import messages from "../../../../../../../messages/uk.json";

import CampaignAnalyticsPage from "../page";

const t = messages.admin.campaigns.analytics;
const ID = "d75c6aa0-d3c3-468b-bffa-6ca82a25a1da";

async function renderPage(campaignId = ID) {
  const ui = await CampaignAnalyticsPage({
    params: Promise.resolve({ campaignId }),
  });
  return render(<>{ui}</>);
}

beforeEach(() => {
  data.actor = { kind: "admin", id: "a1", email: "admin@example.com" };
  data.events = [];
});

describe("the campaign analytics page", () => {
  it("shows the running counts at the end of each day, quiet days included", async () => {
    data.events = [
      { applicationId: "a", day: "2026-11-01", state: "waiting" },
      { applicationId: "b", day: "2026-11-01", state: "waiting" },
      { applicationId: "c", day: "2026-11-01", state: "other" },
      { applicationId: "a", day: "2026-11-03", state: "claimed" },
    ];
    const { container } = await renderPage();

    const table = screen.getByRole("table", { name: t.tableCaption });
    for (const header of [t.day, t.series.waiting, t.series.claimed]) {
      expect(
        within(table).getByRole("columnheader", { name: header }),
      ).toBeInTheDocument();
    }

    const first = within(table).getByRole("row", { name: /01\.11\.2026/ });
    expect(
      within(first)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["2", "0"]);
    const quiet = within(table).getByRole("row", { name: /02\.11\.2026/ });
    expect(
      within(quiet)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["2", "0"]);
    const last = within(table).getByRole("row", { name: /03\.11\.2026/ });
    expect(
      within(last)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["1", "1"]);

    expect(
      screen.getByRole("img", { name: t.chartDescription }),
    ).toBeInTheDocument();
    // The legend names the lines in text, so no line is told apart by
    // colour alone.
    const figure = screen.getByRole("figure");
    expect(within(figure).getByText(t.chartTitle)).toBeInTheDocument();
    expect(
      within(figure)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([t.series.waiting, t.series.claimed]);

    expect(await axe(container)).toHaveNoViolations();
  });

  it("says so when the campaign has no applications yet", async () => {
    await renderPage();

    expect(screen.getByText(t.empty)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("sends anyone who is not an admin to the admin login", async () => {
    data.actor = { kind: "user", id: "u1", roles: ["volunteer"] };

    await expect(renderPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/admin/login");
  });

  it("is a 404 for an id that is not a uuid", async () => {
    await expect(renderPage("index.php")).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
