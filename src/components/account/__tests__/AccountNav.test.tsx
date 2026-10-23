import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

let pathname = "/account/volunteer";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

import messages from "../../../../messages/uk.json";
import { axe } from "@/test/axe";
import { AccountNav, type Cabinet } from "../AccountNav";

const t = messages.account;

const VOLUNTEER_LINKS = [
  {
    key: "children",
    href: "/account/volunteer/children",
    labelKey: "volunteer.links.children",
    emoji: "🔍",
  },
  {
    key: "claims",
    href: "/account/volunteer/claims",
    labelKey: "volunteer.links.claims",
    emoji: "👧",
  },
] as const;

function cabinets({
  volunteer = true,
  parent = false,
}: { volunteer?: boolean; parent?: boolean } = {}): Cabinet[] {
  return [
    {
      key: "volunteer",
      href: "/account/volunteer",
      emoji: "🧙",
      available: volunteer,
      links: VOLUNTEER_LINKS,
    },
    {
      key: "parent",
      href: "/account/parent/applications",
      emoji: "👫",
      available: parent,
      links: [],
    },
  ];
}

function renderNav(
  list: Cabinet[] = cabinets(),
  identity: string | null = null,
) {
  return render(
    <NextIntlClientProvider locale="uk" messages={messages}>
      <AccountNav cabinets={list} identity={identity} />
    </NextIntlClientProvider>,
  );
}

describe("AccountNav cabinets", () => {
  // The design greys the cabinet you do not hold. A greyed LINK that still
  // navigates is worse than no link — it would take a volunteer into a parent
  // cabinet with no application in it — so the row must not be a link at all.
  it("does not link a cabinet the person does not hold", () => {
    renderNav(cabinets({ volunteer: true, parent: false }));

    expect(
      screen.getByRole("link", { name: new RegExp(t.cabinets.volunteer) }),
    ).toHaveAttribute("href", "/account/volunteer");
    expect(
      screen.queryByRole("link", { name: new RegExp(t.cabinets.parent) }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(t.cabinets.parent)).toBeInTheDocument();
  });

  it("links both when the person holds both", () => {
    renderNav(cabinets({ volunteer: true, parent: true }));

    expect(
      screen.getByRole("link", { name: new RegExp(t.cabinets.parent) }),
    ).toHaveAttribute("href", "/account/parent/applications");
  });

  // The ✅ says «this cabinet is yours». It is the only thing separating the
  // two rows for anyone who cannot see that the other is grey, so it carries a
  // name rather than being decorative.
  it("marks the cabinets you hold, audibly", () => {
    renderNav(cabinets({ volunteer: true, parent: false }));

    expect(screen.getAllByRole("img", { name: t.nav.available })).toHaveLength(
      1,
    );
  });

  it("marks where you are with aria-current, not with the tick", () => {
    renderNav(cabinets({ volunteer: true, parent: true }));

    const current = screen.getByRole("link", {
      name: new RegExp(t.cabinets.volunteer),
    });
    expect(current).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("link", { name: new RegExp(t.cabinets.parent) }),
    ).not.toHaveAttribute("aria-current");
  });
});

describe("AccountNav sub-navigation", () => {
  it("shows the current cabinet's links", () => {
    renderNav();

    expect(
      screen.getByRole("link", { name: t.volunteer.links.children }),
    ).toHaveAttribute("href", "/account/volunteer/children");
    expect(
      screen.getByRole("link", { name: t.volunteer.links.claims }),
    ).toHaveAttribute("href", "/account/volunteer/claims");
  });

  // A page inside the cabinet is still in the cabinet — the row stays lit and
  // its links stay up, which is what the design shows for «Знайти історію».
  it("keeps the cabinet current on a page beneath it", () => {
    pathname = "/account/volunteer/children";
    renderNav();

    expect(
      screen.getByRole("link", { name: new RegExp(t.cabinets.volunteer) }),
    ).toHaveAttribute("aria-current", "page");
    pathname = "/account/volunteer";
  });

  // The check is the path or a path SEGMENT beneath it, so a route that merely
  // STARTS with the cabinet's path is not inside it.
  it("does not treat a path that merely shares the prefix as inside", () => {
    pathname = "/account/volunteers-elsewhere";
    const { unmount } = renderNav(cabinets({ volunteer: true, parent: true }));

    expect(
      screen.getByRole("link", { name: new RegExp(t.cabinets.volunteer) }),
    ).not.toHaveAttribute("aria-current");
    expect(
      screen.queryByRole("link", { name: t.volunteer.links.children }),
    ).not.toBeInTheDocument();
    unmount();
    pathname = "/account/volunteer";
  });

  it("lights the cabinet the current page belongs to", () => {
    pathname = "/account/parent/applications";
    renderNav(cabinets({ volunteer: true, parent: true }));

    expect(
      screen.getByRole("link", { name: new RegExp(t.cabinets.parent) }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("link", { name: new RegExp(t.cabinets.volunteer) }),
    ).not.toHaveAttribute("aria-current");
    // The volunteer links belong to a cabinet that is not current.
    expect(
      screen.queryByRole("link", { name: t.volunteer.links.children }),
    ).not.toBeInTheDocument();
    pathname = "/account/volunteer";
  });
});

describe("AccountNav profile row", () => {
  // There is no profile page to go to, and a row that looks clickable and is
  // not is worse than one that does not.
  it("is not a link", () => {
    renderNav();

    const nav = screen.getByRole("navigation", { name: t.nav.label });
    const names = within(nav)
      .getAllByRole("link")
      .map((link) => link.textContent ?? "");
    expect(names.some((n) => n.includes(t.nav.profile.title))).toBe(false);
    expect(screen.getByText(t.nav.profile.title)).toBeInTheDocument();
  });

  it("shows the Telegram handle when there is one, and says so when there is not", () => {
    const { unmount } = renderNav(cabinets(), "@olena");
    expect(screen.getByText("@olena")).toBeInTheDocument();
    expect(screen.queryByText(t.nav.profile.subtitle)).not.toBeInTheDocument();
    unmount();

    // A Telegram @username is optional and must never be required (Phase 4),
    // so this is a real signed-in person, not an edge case.
    renderNav(cabinets(), null);
    expect(screen.getByText(t.nav.profile.subtitle)).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = renderNav(
      cabinets({ volunteer: true, parent: true }),
      "@olena",
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
