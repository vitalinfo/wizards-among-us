import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);

import messages from "../../../../messages/uk.json";
import { parseModerationQuery } from "@/features/applications/moderationFilter";
import { axe } from "@/test/axe";

import { ModerationFilterForm } from "../ModerationFilterForm";

const t = messages.admin.applications.filter;
const tStatus = messages.parent.applications.status;

async function renderForm(params: Parameters<typeof parseModerationQuery>[0]) {
  const ui = await ModerationFilterForm({
    query: parseModerationQuery(params),
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

    expect(screen.getByLabelText(t.status)).toBeVisible();
    expect(screen.getByLabelText(t.submittedFrom)).toBeVisible();
    expect(screen.getByLabelText(t.submittedTo)).toBeVisible();
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

  it("has no accessibility violations", async () => {
    const { container } = await renderForm({ status: "all" });
    expect(await axe(container)).toHaveNoViolations();
  });
});
