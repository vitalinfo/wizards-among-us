import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);

import messages from "../../../../messages/uk.json";
import { parseAuditQuery } from "@/features/audit/listQuery";
import { axe } from "@/test/axe";

import { AuditFilterForm } from "../AuditFilterForm";

const t = messages.admin.audit.filter;
const TARGET = "d75c6aa0-d3c3-468b-bffa-6ca82a25a1da";
const ACTIONS = [
  "application.approved",
  "application.rejected",
  "campaign.created",
];

async function renderForm(params: Parameters<typeof parseAuditQuery>[0]) {
  const ui = await AuditFilterForm({
    query: parseAuditQuery(params),
    actions: ACTIONS,
  });
  return render(<>{ui}</>);
}

describe("AuditFilterForm", () => {
  // A GET form, so filtering needs no client JS and every filtered view stays
  // a shareable url.
  it("is a GET form aimed at the log", async () => {
    await renderForm({});
    const form = screen.getByRole("form", { name: t.legend });

    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/admin/audit");
  });

  // Grouped by entity, sorted by label inside a group: approved precedes
  // rejected as codes, and «…відхилено» precedes «…схвалено» as labels.
  it("offers every logged action by name, grouped by entity", async () => {
    await renderForm({});
    const select = screen.getByLabelText(t.action);
    const a = messages.admin.audit;

    expect(select).toHaveAttribute("name", "action");
    const applications = screen.getByRole("group", {
      name: a.actionGroups.application,
    });
    expect(
      within(applications)
        .getAllByRole("option")
        .map((option) => [option.getAttribute("value"), option.textContent]),
    ).toEqual([
      ["application.rejected", a.actions.application.rejected],
      ["application.approved", a.actions.application.approved],
    ]);
    expect(
      within(
        screen.getByRole("group", { name: a.actionGroups.campaign }),
      ).getByRole("option", { name: a.actions.campaign.created }),
    ).toHaveValue("campaign.created");
    // «Усі дії» stays first, outside any group.
    expect(screen.getAllByRole("option")[0]).toHaveTextContent(t.allActions);
  });

  // A url can name an action nothing has logged yet; the select must still
  // say it is filtering rather than fall back to «Усі дії».
  it("keeps an applied action that is not among the logged ones", async () => {
    await renderForm({ action: "application.reopened" });
    expect(screen.getByLabelText(t.action)).toHaveValue("application.reopened");
  });

  it("asks the browser to refuse anything but a uuid", async () => {
    await renderForm({});
    const input = screen.getByLabelText(t.targetId);

    expect(input).toHaveAttribute("name", "target");
    expect(
      new RegExp(`^(?:${input.getAttribute("pattern")})$`).test(TARGET),
    ).toBe(true);
    expect(
      new RegExp(`^(?:${input.getAttribute("pattern")})$`).test("index.php"),
    ).toBe(false);
  });

  // Empty controls over filtered rows would look like the whole log.
  it("shows the filter that is actually applied", async () => {
    await renderForm({ action: "application.rejected", target: TARGET });

    expect(screen.getByLabelText(t.action)).toHaveValue("application.rejected");
    expect(screen.getByLabelText(t.targetId)).toHaveValue(TARGET);
  });

  it("offers a reset only once something is filtered", async () => {
    const clean = await renderForm({});
    expect(screen.queryByRole("link", { name: t.reset })).toBeNull();
    clean.unmount();

    await renderForm({ target: TARGET });
    expect(screen.getByRole("link", { name: t.reset })).toHaveAttribute(
      "href",
      "/admin/audit",
    );
  });

  // «Скинути» is a client-side navigation that re-renders in place; the
  // uncontrolled controls must still clear.
  it("shows the new filter when re-rendered in place", async () => {
    const view = await renderForm({
      action: "application.approved",
      target: TARGET,
    });
    view.rerender(
      <>
        {await AuditFilterForm({
          query: parseAuditQuery({}),
          actions: ACTIONS,
        })}
      </>,
    );

    expect(screen.getByLabelText(t.action)).toHaveValue("");
    expect(screen.getByLabelText(t.targetId)).toHaveValue("");
  });

  it("has no accessibility violations", async () => {
    const { container } = await renderForm({
      action: "application.approved",
      target: TARGET,
    });
    expect(await axe(container)).toHaveNoViolations();
  });
});
