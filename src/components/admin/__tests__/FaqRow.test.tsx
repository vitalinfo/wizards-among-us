import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);

// The row binds the reorder server action; the spec cares about the controls it
// renders, not about the action running.
vi.mock("@/app/admin/faqs/actions", () => ({
  moveFaqAction: vi.fn(),
}));

import messages from "../../../../messages/uk.json";
import type { AdminFaq } from "@/features/faqs/adminQueries";
import { axe } from "@/test/axe";

import { FaqRow } from "../FaqRow";

const t = messages.admin.faqs;

const faq: AdminFaq = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Хто може подати заявку?",
  description: "Родини з дітьми, які через війну виїхали з дому.",
  status: "active",
  ordinal: 0,
  createdAt: new Date("2026-01-01T10:00:00Z"),
  updatedAt: new Date("2026-01-01T10:00:00Z"),
};

async function renderRow(
  overrides: Partial<Parameters<typeof FaqRow>[0]> = {},
) {
  const ui = await FaqRow({
    faq,
    isFirst: false,
    isLast: false,
    ...overrides,
  });
  return render(<ol>{ui}</ol>);
}

const withTitle = (template: string, title = faq.title) =>
  template.replace("{title}", title);

describe("FaqRow", () => {
  it("shows the question and the answer an admin is looking at", async () => {
    await renderRow();

    expect(
      screen.getByRole("heading", { name: faq.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(faq.description)).toBeVisible();
  });

  // Status by text, not colour alone — a hidden entry must read as hidden.
  it("states the status in words", async () => {
    await renderRow();
    expect(screen.getByText(t.status.active)).toBeVisible();
  });

  it("says 'Приховано' for an inactive entry", async () => {
    await renderRow({ faq: { ...faq, status: "inactive" } });
    expect(screen.getByText(t.status.inactive)).toBeVisible();
    expect(screen.queryByText(t.status.active)).not.toBeInTheDocument();
  });

  // Every row's visible text is identical, so the accessible name has to name
  // WHICH entry the control acts on.
  it("names each control by the entry it acts on", async () => {
    await renderRow();

    expect(
      screen.getByRole("button", { name: withTitle(t.moveUpFor) }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: withTitle(t.moveDownFor) }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: withTitle(t.editCtaFor) }),
    ).toHaveAttribute("href", `/admin/faqs/${faq.id}/edit`);
  });

  // Deleting is confirmed on the list page, so the trigger is a link to the
  // ?confirm= state and never the action itself.
  it("routes delete through the confirmation, not straight to the action", async () => {
    await renderRow();

    expect(
      screen.getByRole("link", { name: withTitle(t.deleteCtaFor) }),
    ).toHaveAttribute("href", `/admin/faqs?confirm=delete&id=${faq.id}`);
  });

  // Disabled rather than hidden, so the buttons don't move under the pointer
  // as rows shuffle.
  it("disables the move that would run off the top of the list", async () => {
    await renderRow({ isFirst: true });

    expect(
      screen.getByRole("button", { name: withTitle(t.moveUpFor) }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: withTitle(t.moveDownFor) }),
    ).toBeEnabled();
  });

  it("disables the move that would run off the bottom of the list", async () => {
    await renderRow({ isLast: true });

    expect(
      screen.getByRole("button", { name: withTitle(t.moveDownFor) }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: withTitle(t.moveUpFor) }),
    ).toBeEnabled();
  });

  it("has no accessibility violations", async () => {
    const { container } = await renderRow();
    expect(await axe(container)).toHaveNoViolations();
  });
});
