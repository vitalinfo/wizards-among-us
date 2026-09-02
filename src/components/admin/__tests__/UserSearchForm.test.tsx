import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);

import messages from "../../../../messages/uk.json";
import { parseUsersQuery } from "@/features/users/listQuery";
import { axe } from "@/test/axe";

import { UserSearchForm } from "../UserSearchForm";

const t = messages.admin.users.search;

async function renderForm(params: Parameters<typeof parseUsersQuery>[0]) {
  const ui = await UserSearchForm({ query: parseUsersQuery(params) });
  return render(<>{ui}</>);
}

describe("UserSearchForm", () => {
  // A GET form, so searching needs no client JS and every result set stays a
  // shareable url. If this becomes a POST, both properties go silently.
  it("is a GET form aimed at the list", async () => {
    const { container } = await renderForm({});
    const form = container.querySelector("form");

    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/admin/users");
  });

  it("is announced as a search landmark", async () => {
    await renderForm({});
    expect(screen.getByRole("search")).toBeInTheDocument();
  });

  it("labels the field and says what it matches", async () => {
    await renderForm({});
    const input = screen.getByLabelText(t.label);

    expect(input).toHaveAttribute("name", "q");
    expect(input).toHaveAccessibleDescription(t.hint);
  });

  // The form is rendered from the url; empty controls over filtered results
  // would look like an unfiltered list.
  it("shows the term that is actually applied", async () => {
    await renderForm({ q: "Коваль" });
    expect(screen.getByLabelText(t.label)).toHaveValue("Коваль");
  });

  // A reset that resets nothing is noise on every page load.
  it("offers a reset only once something is searched", async () => {
    const clean = await renderForm({});
    expect(screen.queryByRole("link", { name: t.reset })).toBeNull();
    clean.unmount();

    await renderForm({ q: "Коваль" });
    expect(screen.getByRole("link", { name: t.reset })).toHaveAttribute(
      "href",
      "/admin/users",
    );
  });

  it("has no accessibility violations", async () => {
    const { container } = await renderForm({ q: "Коваль" });
    expect(await axe(container)).toHaveNoViolations();
  });
});
