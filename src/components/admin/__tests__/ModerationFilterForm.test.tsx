import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);

import messages from "../../../../messages/uk.json";
import {
  moderationCampaignScope,
  parseModerationQuery,
} from "@/features/applications/moderationFilter";
import { axe } from "@/test/axe";

import { ModerationFilterForm } from "../ModerationFilterForm";

const t = messages.admin.applications.filter;
const tStatus = messages.parent.applications.status;

const ACTIVE = "aaaaaaaa-0000-0000-0000-000000000001";
const ARCHIVED = "aaaaaaaa-0000-0000-0000-000000000002";
const campaigns = [
  { id: ACTIVE, title: "Святий Миколай 2026", status: "active" },
  { id: ARCHIVED, title: "Святий Миколай 2025", status: "archived" },
];

async function renderForm(
  params: Parameters<typeof parseModerationQuery>[0],
  campaignList = campaigns,
) {
  const campaignScope = moderationCampaignScope(campaignList);
  const ui = await ModerationFilterForm({
    query: parseModerationQuery(params, campaignScope),
    campaigns: campaignList,
    campaignScope,
  });
  return render(<>{ui}</>);
}

describe("ModerationFilterForm", () => {
  // A GET form, so filtering needs no client JS and every filtered queue stays
  // a shareable url. If this ever becomes a POST or grows an onSubmit, both
  // properties go silently.
  it("is a GET form aimed at the queue", async () => {
    const { container } = await renderForm({});
    const form = container.querySelector("form");

    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/admin/applications");
  });

  it("labels every control", async () => {
    await renderForm({});

    expect(screen.getByLabelText(t.campaign)).toBeVisible();
    expect(screen.getByLabelText(t.status)).toBeVisible();
    expect(screen.getByLabelText(t.submittedFrom)).toBeVisible();
    expect(screen.getByLabelText(t.submittedTo)).toBeVisible();
    expect(screen.getByLabelText(t.search)).toBeVisible();
  });

  it("searches by name through a search input named for the url param", async () => {
    await renderForm({});
    const input = screen.getByRole("searchbox", { name: t.search });

    expect(input).toHaveAttribute("name", "q");
    expect(input).toHaveValue("");
  });

  // Submitted together with the other controls, so a name search stays inside
  // the chosen status and campaign rather than replacing them.
  it("shows the search that is applied and offers to reset it", async () => {
    const { container } = await renderForm({ status: "all", q: "Коваль" });

    expect(screen.getByLabelText(t.search)).toHaveValue("Коваль");
    expect(screen.getByRole("link", { name: t.reset })).toBeVisible();
    const data = new FormData(container.querySelector("form")!);
    expect(data.get("q")).toBe("Коваль");
    expect(data.get("status")).toBe("all");
  });

  // Native date inputs: the browser gives the picker, the locale format and the
  // mobile keyboard, and submits YYYY-MM-DD, which is what the url carries.
  it("uses native date inputs named for the url params", async () => {
    await renderForm({});

    for (const [label, name] of [
      [t.submittedFrom, "from"],
      [t.submittedTo, "to"],
    ] as const) {
      const input = screen.getByLabelText(label);
      expect(input).toHaveAttribute("type", "date");
      expect(input).toHaveAttribute("name", name);
    }
  });

  it("offers every status plus «all»", async () => {
    await renderForm({});

    expect(screen.getByRole("option", { name: t.all })).toBeVisible();
    for (const status of ["submitted", "approved", "rejected"] as const) {
      expect(
        screen.getByRole("option", { name: tStatus[status] }),
      ).toBeVisible();
    }
  });

  // The form is rendered from the url, so a filtered queue that came back with
  // empty controls would look unfiltered while showing filtered results.
  it("shows the filter that is actually applied", async () => {
    await renderForm({
      status: "approved",
      from: "2026-08-25",
      to: "2026-09-01",
    });

    expect(screen.getByLabelText(t.status)).toHaveValue("approved");
    expect(screen.getByLabelText(t.submittedFrom)).toHaveValue("2026-08-25");
    expect(screen.getByLabelText(t.submittedTo)).toHaveValue("2026-09-01");
  });

  it("offers every campaign plus «all», marking the active one", async () => {
    await renderForm({});

    expect(
      screen.getByRole("option", { name: t.allCampaigns }),
    ).toHaveAttribute("value", "all");
    expect(
      screen.getByRole("option", {
        name: t.activeCampaign.replace("{title}", "Святий Миколай 2026"),
      }),
    ).toHaveAttribute("value", ACTIVE);
    expect(
      screen.getByRole("option", { name: "Святий Миколай 2025" }),
    ).toHaveAttribute("value", ARCHIVED);
  });

  it("selects the active campaign by default", async () => {
    await renderForm({});
    expect(screen.getByLabelText(t.campaign)).toHaveValue(ACTIVE);
  });

  it("selects every campaign when none is active", async () => {
    await renderForm({}, [{ ...campaigns[1]! }]);
    expect(screen.getByLabelText(t.campaign)).toHaveValue("all");
  });

  it("shows the campaign that is actually applied", async () => {
    await renderForm({ campaign: ARCHIVED });
    expect(screen.getByLabelText(t.campaign)).toHaveValue(ARCHIVED);
  });

  it("defaults to the queue that needs an admin", async () => {
    await renderForm({});

    expect(screen.getByLabelText(t.status)).toHaveValue("submitted");
    expect(screen.getByLabelText(t.submittedFrom)).toHaveValue("");
  });

  // A reset that resets nothing is noise on every page load.
  it("offers a reset only once something is narrowed", async () => {
    const clean = await renderForm({});
    expect(screen.queryByRole("link", { name: t.reset })).toBeNull();
    clean.unmount();

    await renderForm({ from: "2026-09-01" });
    expect(screen.getByRole("link", { name: t.reset })).toHaveAttribute(
      "href",
      "/admin/applications?status=submitted",
    );
  });

  // Leaving the active campaign is narrowing; the reset brings it back.
  it("offers a reset once another campaign is picked", async () => {
    await renderForm({ campaign: "all" });
    expect(screen.getByRole("link", { name: t.reset })).toBeVisible();
  });

  // «Скинути» is a client-side navigation: React re-renders the form in place
  // rather than replacing it, and an uncontrolled select ignores a new
  // defaultValue. The controls must still end up showing the reset query.
  it("shows the new query when re-rendered in place", async () => {
    const view = await renderForm({
      status: "approved",
      campaign: ARCHIVED,
      from: "2026-09-01",
    });
    const scope = moderationCampaignScope(campaigns);
    view.rerender(
      <>
        {await ModerationFilterForm({
          query: parseModerationQuery({}, scope),
          campaigns,
          campaignScope: scope,
        })}
      </>,
    );

    expect(screen.getByLabelText(t.campaign)).toHaveValue(ACTIVE);
    expect(screen.getByLabelText(t.status)).toHaveValue("submitted");
    expect(screen.getByLabelText(t.submittedFrom)).toHaveValue("");
  });

  // The person filter has no visible control; re-applying the status must not
  // widen one person's list back to everyone.
  it("submits the person filter it was opened with", async () => {
    const USER = "bbbbbbbb-0000-0000-0000-000000000001";
    const { container } = await renderForm({ parent: USER });
    const data = new FormData(container.querySelector("form")!);

    expect(data.get("parent")).toBe(USER);
    expect(data.get("claimedBy")).toBeNull();
  });

  it("has no accessibility violations", async () => {
    const { container } = await renderForm({ status: "all", q: "Марія" });
    expect(await axe(container)).toHaveNoViolations();
  });
});
