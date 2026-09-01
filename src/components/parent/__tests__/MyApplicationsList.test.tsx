import { NextIntlClientProvider } from "next-intl";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import messages from "../../../../messages/uk.json";
import type { MyApplicationSummary } from "@/features/applications/queries";
import { formats, locale, timeZone } from "@/i18n/request";

import { MyApplicationsList } from "../MyApplicationsList";

// Wrap with the REAL locale config, not ad-hoc values: a named format that
// exists here but not in the app (or vice versa) is exactly the drift this
// suite should catch.
function renderList(applications: MyApplicationSummary[]) {
  render(
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone={timeZone}
      formats={formats}
    >
      <MyApplicationsList applications={applications} />
    </NextIntlClientProvider>,
  );
}

const draft: MyApplicationSummary = {
  id: "a1",
  childName: "Оля",
  childAge: 7,
  giftDescription: "Лялька",
  status: "draft",
  submittedAt: null,
  updatedAt: new Date("2026-08-01T10:00:00Z"),
};

describe("MyApplicationsList", () => {
  it("shows the empty state when there are no applications", () => {
    renderList([]);
    expect(
      screen.getByText(messages.parent.applications.empty),
    ).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("renders a record collection with the child, gift and status", () => {
    renderList([draft]);

    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("Оля")).toBeInTheDocument();
    expect(screen.getByText("Лялька")).toBeInTheDocument();
    // Status must read as text, not colour alone.
    expect(
      screen.getByText(messages.parent.applications.status.draft),
    ).toBeInTheDocument();
  });

  it("invites the parent to continue a draft, but only to view a locked one", () => {
    renderList([draft, { ...draft, id: "a2", status: "approved" }]);

    expect(
      screen.getByRole("link", {
        name: messages.parent.applications.continueCta,
      }),
    ).toHaveAttribute("href", "/parent/applications/a1");
    expect(
      screen.getByRole("link", { name: messages.parent.applications.viewCta }),
    ).toHaveAttribute("href", "/parent/applications/a2");
  });

  // Regression: the component asked for a named format that didn't exist, and
  // next-intl fell back to Date.toString() — "Thu Aug 01 2026 10:00:00 GMT+0000
  // (Coordinated Universal Time)" rendered on the page. Assert the real shape.
  it("formats the timestamp for the uk locale, not a raw Date", () => {
    renderList([draft]);

    const stamp = screen.getByText(/^Збережено/);
    expect(stamp).toHaveTextContent(/Збережено \d{2}\.\d{2}\.\d{4}$/);
    expect(stamp.textContent).not.toMatch(/GMT|Coordinated Universal Time/);
  });

  it("falls back to a placeholder when the draft has no child name yet", () => {
    renderList([{ ...draft, childName: null, childAge: null }]);
    expect(
      screen.getByText(messages.parent.applications.childFallback),
    ).toBeInTheDocument();
  });
});

// The label has to describe the state, not just whether the link is editable.
// A submitted application IS still editable — the lock lands on admin approval
// — but «Продовжити заповнення» tells a parent it is unfinished when they have
// already sent it.
describe("call to action per status", () => {
  const cases = [
    ["draft", messages.parent.applications.continueCta],
    ["submitted", messages.parent.applications.reviewCta],
    ["approved", messages.parent.applications.viewCta],
    ["claimed", messages.parent.applications.viewCta],
    ["fulfilled", messages.parent.applications.viewCta],
    ["rejected", messages.parent.applications.viewCta],
  ] as const;

  it.each(cases)("a %s application offers «%s»", (status, label) => {
    renderList([{ ...draft, status }]);
    expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
  });

  it("never tells a parent to keep filling in an application they submitted", () => {
    renderList([{ ...draft, status: "submitted" }]);
    expect(
      screen.queryByRole("link", {
        name: messages.parent.applications.continueCta,
      }),
    ).not.toBeInTheDocument();
  });
});
