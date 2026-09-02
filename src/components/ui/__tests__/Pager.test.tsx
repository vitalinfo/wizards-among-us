import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);

import messages from "../../../../messages/uk.json";
import { axe } from "@/test/axe";

import { Pager } from "../Pager";

const t = messages.common.pager;

async function renderPager(props: Partial<Parameters<typeof Pager>[0]> = {}) {
  const ui = await Pager({
    label: "Сторінки черги",
    page: 2,
    pageCount: 3,
    total: 57,
    from: 25,
    to: 48,
    hrefFor: (page) => `/admin/applications?page=${page}`,
    ...props,
  });
  return render(<>{ui}</>);
}

describe("Pager", () => {
  it("says where in the results you are", async () => {
    await renderPager();

    expect(
      screen.getByText(
        t.range
          .replace("{from}", "25")
          .replace("{to}", "48")
          .replace("{total}", "57"),
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        t.position.replace("{page}", "2").replace("{pageCount}", "3"),
      ),
    ).toBeVisible();
  });

  it("links both ways from the middle", async () => {
    await renderPager();

    expect(screen.getByRole("link", { name: t.previous })).toHaveAttribute(
      "href",
      "/admin/applications?page=1",
    );
    expect(screen.getByRole("link", { name: t.next })).toHaveAttribute(
      "href",
      "/admin/applications?page=3",
    );
  });

  // A "previous" on page 1 either 404s or silently does nothing; both are worse
  // than not being there.
  it("omits the direction that does not exist", async () => {
    const first = await renderPager({ page: 1 });
    expect(screen.queryByRole("link", { name: t.previous })).toBeNull();
    expect(screen.getByRole("link", { name: t.next })).toBeVisible();
    first.unmount();

    await renderPager({ page: 3 });
    expect(screen.getByRole("link", { name: t.previous })).toBeVisible();
    expect(screen.queryByRole("link", { name: t.next })).toBeNull();
  });

  // The count is the answer to the question that brought the admin here; it is
  // not paging information, so it survives when there is only one page.
  it("still reports the total on a single page", async () => {
    await renderPager({ page: 1, pageCount: 1, total: 4, from: 1, to: 4 });

    expect(screen.getByText(/4/)).toBeVisible();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("renders nothing at all when there is nothing to count", async () => {
    const { container } = await renderPager({
      page: 1,
      pageCount: 1,
      total: 0,
      from: 0,
      to: 0,
    });

    expect(container).toBeEmptyDOMElement();
  });

  it("is a labelled navigation landmark", async () => {
    await renderPager();

    expect(
      screen.getByRole("navigation", { name: "Сторінки черги" }),
    ).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = await renderPager();
    expect(await axe(container)).toHaveNoViolations();
  });
});
