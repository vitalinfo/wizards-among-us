import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import messages from "../../../../messages/uk.json";
import type { ReviewStatusFilter } from "@/features/reviews/listFilter";
import { axe } from "@/test/axe";

import { ReviewFilterForm } from "../ReviewFilterForm";

const t = messages.admin.reviews.filter;

function renderForm(status: ReviewStatusFilter) {
  return render(
    <NextIntlClientProvider locale="uk" messages={messages}>
      <ReviewFilterForm status={status} />
    </NextIntlClientProvider>,
  );
}

describe("ReviewFilterForm", () => {
  // A GET form, so filtering needs no client JS and the url is shareable.
  it("is a GET form aimed at the reviews list", async () => {
    const { container } = renderForm("all");
    const form = screen.getByRole("form", { name: t.legend });

    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/admin/reviews");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("offers every status by name, with the applied one selected", () => {
    renderForm("hidden");
    const select = screen.getByLabelText(t.status);

    expect(select).toHaveAttribute("name", "status");
    expect(select).toHaveValue("hidden");
    expect(
      within(select)
        .getAllByRole("option")
        .map((option) => [option.getAttribute("value"), option.textContent]),
    ).toEqual([
      ["all", t.all],
      ["published", t.published],
      ["hidden", t.hidden],
    ]);
    expect(screen.getByRole("button", { name: t.apply })).toHaveAttribute(
      "type",
      "submit",
    );
  });

  // A reset that resets nothing is noise.
  it("offers a reset only once the list is narrowed", () => {
    const { unmount } = renderForm("all");
    expect(screen.queryByRole("link", { name: t.reset })).toBeNull();
    unmount();

    renderForm("published");
    expect(screen.getByRole("link", { name: t.reset })).toHaveAttribute(
      "href",
      "/admin/reviews",
    );
  });
});
