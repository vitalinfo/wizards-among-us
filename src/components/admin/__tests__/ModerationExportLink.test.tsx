import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import messages from "../../../../messages/uk.json";
import {
  moderationCampaignScope,
  parseModerationQuery,
} from "@/features/applications/moderationFilter";
import { axe } from "@/test/axe";

import { ModerationExportLink } from "../ModerationExportLink";

const t = messages.admin.applications.export;

const ACTIVE = "aaaaaaaa-0000-0000-0000-000000000001";
const scope = moderationCampaignScope([{ id: ACTIVE, status: "active" }]);

function renderLink(params: Parameters<typeof parseModerationQuery>[0]) {
  return render(
    <ModerationExportLink
      query={parseModerationQuery(params, scope)}
      label={t.cta}
      campaignRequired={t.campaignRequired}
    />,
  );
}

describe("ModerationExportLink", () => {
  it("downloads the queue under the applied filter, every page of it", async () => {
    const { container } = renderLink({
      campaign: ACTIVE,
      status: "approved",
      from: "2026-11-01",
      q: "Коваль",
      page: "3",
    });

    const link = screen.getByRole("link", { name: t.cta });
    const url = new URL(link.getAttribute("href")!, "http://localhost");
    expect(url.pathname).toBe("/admin/applications/export");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      status: "approved",
      campaign: ACTIVE,
      from: "2026-11-01",
      q: "Коваль",
    });
    expect(await axe(container)).toHaveNoViolations();
  });

  it("asks for one campaign instead of offering «Усі кампанії»", async () => {
    renderLink({ campaign: "all" });

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText(t.campaignRequired)).toBeInTheDocument();
  });
});
