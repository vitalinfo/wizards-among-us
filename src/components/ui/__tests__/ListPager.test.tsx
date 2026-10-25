import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);

import messages from "../../../../messages/uk.json";
import { formats, locale, timeZone } from "@/i18n/config";
import type { PageSize } from "@/lib/pageSize";
import { axe } from "@/test/axe";

import { ListPager } from "../ListPager";

const t = messages.common.listPager;

async function renderPager({
  page = 2,
  pageCount = 3,
  total = 25,
  per = 10 as PageSize,
} = {}) {
  const ui = await ListPager({
    label: "Сторінки заявок",
    page,
    pageCount,
    total,
    from: (page - 1) * per + 1,
    to: Math.min(page * per, total),
    per,
    hrefFor: (target) => `/list?page=${target}&per=${per}`,
    sizeHref: (size) => `/list?per=${size}`,
  });
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      formats={formats}
      timeZone={timeZone}
    >
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("ListPager", () => {
  it("is a named nav with the range and both arrows in the middle", async () => {
    await renderPager();
    const nav = screen.getByRole("navigation", { name: "Сторінки заявок" });

    expect(within(nav).getByText("11–20 з 25")).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: t.previous })).toHaveAttribute(
      "href",
      "/list?page=1&per=10",
    );
    expect(within(nav).getByRole("link", { name: t.next })).toHaveAttribute(
      "href",
      "/list?page=3&per=10",
    );
  });

  // At either end the arrow stays on screen (so the row does not shift) but
  // is not a link, and not announced as a control that does nothing.
  it("offers no arrow past either end", async () => {
    const first = await renderPager({ page: 1 });
    expect(
      screen.queryByRole("link", { name: t.previous }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: t.next })).toBeInTheDocument();
    first.unmount();

    await renderPager({ page: 3 });
    expect(
      screen.queryByRole("link", { name: t.next }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: t.previous })).toBeInTheDocument();
  });

  it("shows the range even on a single page, with no arrows", async () => {
    await renderPager({ page: 1, pageCount: 1, total: 4 });
    expect(screen.getByText("1–4 з 4")).toBeInTheDocument();
    expect(screen.queryAllByRole("link", { name: /сторінка/i })).toHaveLength(
      0,
    );
  });

  it("renders nothing for an empty list", async () => {
    const { container } = await renderPager({
      page: 1,
      pageCount: 1,
      total: 0,
    });
    expect(container).toBeEmptyDOMElement();
  });

  // The picker is a <details>: it opens with no script, and each size is a
  // link that starts again from page 1.
  it("opens the size picker and offers each size as a link", async () => {
    const user = userEvent.setup();
    await renderPager({ per: 20 });

    const toggle = screen.getByText(t.perPage).closest("summary");
    expect(toggle).not.toBeNull();
    const details = toggle!.closest("details")!;
    expect(details).not.toHaveAttribute("open");

    // A click, as in the FilterTabs spec: jsdom toggles a <details> from its
    // summary's click, but does not model Enter on a summary.
    await user.click(toggle!);
    expect(details).toHaveAttribute("open");

    for (const size of [5, 10, 20]) {
      const link = within(details).getByRole("link", { name: String(size) });
      expect(link).toHaveAttribute("href", `/list?per=${size}`);
      if (size === 20) {
        expect(link).toHaveAttribute("aria-current", "true");
      } else {
        expect(link).not.toHaveAttribute("aria-current");
      }
    }
  });

  it("has no axe violations", async () => {
    const { container } = await renderPager();
    expect(await axe(container)).toHaveNoViolations();
  });
});
