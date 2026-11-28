import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import messages from "../../../../messages/uk.json";
import {
  ALL_REVIEWS,
  type ReviewListFilter,
} from "@/features/reviews/listFilter";
import { axe } from "@/test/axe";

import { ReviewFilterForm } from "../ReviewFilterForm";

const t = messages.admin.reviews.filter;

function renderForm(filter: Partial<ReviewListFilter> = {}) {
  return render(
    <NextIntlClientProvider locale="uk" messages={messages}>
      <ReviewFilterForm filter={{ ...ALL_REVIEWS, ...filter }} />
    </NextIntlClientProvider>,
  );
}

describe("ReviewFilterForm", () => {
  // A GET form, so filtering needs no client JS and the url is shareable.
  it("is a GET form aimed at the reviews list", async () => {
    const { container } = renderForm();
    const form = screen.getByRole("form", { name: t.legend });

    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/admin/reviews");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("offers every status by name, with the applied one selected", () => {
    renderForm({ status: "hidden" });
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
    const { unmount } = renderForm();
    expect(screen.queryByRole("link", { name: t.reset })).toBeNull();
    unmount();

    renderForm({ status: "published" });
    expect(screen.getByRole("link", { name: t.reset })).toHaveAttribute(
      "href",
      "/admin/reviews",
    );
  });

  it("offers every gallery filter by name, with the applied one selected", () => {
    renderForm({ gallery: "eligible" });
    const select = screen.getByLabelText(t.gallery.label);

    expect(select).toHaveAttribute("name", "gallery");
    expect(select).toHaveValue("eligible");
    expect(
      within(select)
        .getAllByRole("option")
        .map((option) => [option.getAttribute("value"), option.textContent]),
    ).toEqual([
      ["all", t.gallery.all],
      ["in", t.gallery.in],
      ["eligible", t.gallery.eligible],
    ]);
  });

  it("offers a reset when only the gallery filter is narrowed", () => {
    renderForm({ gallery: "in" });
    expect(screen.getByRole("link", { name: t.reset })).toHaveAttribute(
      "href",
      "/admin/reviews",
    );
  });
});
