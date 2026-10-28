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

const PARENT_LINKS = [
  {
    key: "applications",
    href: "/account/parent/applications",
    labelKey: "parent.links.applications",
    emoji: "📋",
  },
  {
    key: "volunteer",
    href: "/account/parent/my-volunteer",
    labelKey: "parent.links.volunteer",
    emoji: "🔮",
  },
] as const;

// Stand-ins for the server-rendered «Подати заявку», distinguishable by name
// so a spec can tell which drawing the nav chose.
const PARENT_ACTION = {
  sidebar: <button type="button">sidebar action</button>,
  panel: <button type="button">panel action</button>,
};

function cabinets({ action = false }: { action?: boolean } = {}): Cabinet[] {
  return [
    {
      key: "volunteer",
      href: "/account/volunteer",
      emoji: "🧙",
      links: VOLUNTEER_LINKS,
    },
    {
      key: "parent",
      href: "/account/parent",
      emoji: "👫",
      links: PARENT_LINKS,
      action: action ? PARENT_ACTION : undefined,
    },
  ];
}

function renderNav(
  list: Cabinet[] = cabinets(),
  identity: string | null = null,
  placement: "sidebar" | "panel" = "sidebar",
) {
  return render(
    <NextIntlClientProvider locale="uk" messages={messages}>
      <AccountNav cabinets={list} identity={identity} placement={placement} />
    </NextIntlClientProvider>,
  );
}

describe("AccountNav cabinets", () => {
  // Neither cabinet is gated on a role any more (Vital): both are links for
  // everyone, and each cabinet's pages decide what you may do inside it.
  it("links both cabinets", () => {
    renderNav(cabinets());

    expect(
      screen.getByRole("link", { name: new RegExp(t.cabinets.volunteer) }),
    ).toHaveAttribute("href", "/account/volunteer");
    expect(
      screen.getByRole("link", { name: new RegExp(t.cabinets.parent) }),
    ).toHaveAttribute("href", "/account/parent");
  });

  // The ✅ is gone (Vital, agreed with the designers). The tint and
  // aria-current say where you are, so nothing here rests on colour alone.
  it("no longer marks a held cabinet with a tick", () => {
    renderNav(cabinets());

    expect(screen.queryByText("✅")).not.toBeInTheDocument();
    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });

  it("marks where you are with aria-current, not with a tick", () => {
    renderNav(cabinets());

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

  // The layout hands over no volunteer links until the person has opted in as
  // one — /account/volunteer/children would redirect them straight back here,
  // which from this very sidebar reads as a link that does nothing. The
  // cabinet is then its front page and the button on it, so the divider the
  // sub-navigation sits under must go too.
  it("renders no sub-navigation for a cabinet with no links", () => {
    const list = cabinets();
    renderNav([{ ...list[0], links: [] }, list[1]]);

    expect(
      screen.queryByRole("link", { name: t.volunteer.links.children }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: t.volunteer.links.claims }),
    ).not.toBeInTheDocument();
    // The cabinet itself is still there to be opened — only what is under it
    // is gone.
    expect(
      screen.getByRole("link", { name: new RegExp(t.cabinets.volunteer) }),
    ).toHaveAttribute("href", "/account/volunteer");
    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
  });

  // A page inside the cabinet is still in the cabinet — the row stays lit and
  // its links stay up, which is what the design shows for «Знайти історію».
  //
  // But it is the SECTION you are in, not the page: «page» belongs to the
  // sub-link, and two elements announcing "current page" is a defect only a
  // screen-reader user would meet.
  it("marks the cabinet as the section you are in, not the page", () => {
    pathname = "/account/volunteer/children";
    renderNav();

    expect(
      screen.getByRole("link", { name: new RegExp(t.cabinets.volunteer) }),
    ).toHaveAttribute("aria-current", "location");
    expect(
      screen
        .getAllByRole("link")
        .filter((link) => link.getAttribute("aria-current") === "page"),
    ).toHaveLength(1);
    pathname = "/account/volunteer";
  });

  it("marks the cabinet as the page when its own front page is open", () => {
    pathname = "/account/volunteer";
    renderNav();

    expect(
      screen.getByRole("link", { name: new RegExp(t.cabinets.volunteer) }),
    ).toHaveAttribute("aria-current", "page");
  });

  // The check is the path or a path SEGMENT beneath it, so a route that merely
  // STARTS with the cabinet's path is not inside it.
  it("does not treat a path that merely shares the prefix as inside", () => {
    pathname = "/account/volunteers-elsewhere";
    const { unmount } = renderNav(cabinets());

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
    renderNav(cabinets());

    expect(
      screen.getByRole("link", { name: new RegExp(t.cabinets.parent) }),
    ).toHaveAttribute("aria-current", "location");
    expect(
      screen.getByRole("link", { name: t.parent.links.applications }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("link", { name: t.parent.links.volunteer }),
    ).toHaveAttribute("href", "/account/parent/my-volunteer");
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
    const { container } = renderNav(cabinets(), "@olena");
    expect(await axe(container)).toHaveNoViolations();
  });
});

// The design highlights the page you are on inside the cabinet, not just the
// cabinet itself.
describe("AccountNav current page", () => {
  it("marks the sub-link you are on, by name as well as by colour", () => {
    pathname = "/account/volunteer/children";
    renderNav();

    expect(
      screen.getByRole("link", { name: t.volunteer.links.children }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("link", { name: t.volunteer.links.claims }),
    ).not.toHaveAttribute("aria-current");
    pathname = "/account/volunteer";
  });

  // The cabinet row stays current for a page BENEATH it, but the sub-link is
  // only current for its own page — otherwise two rows would claim to be where
  // you are.
  it("does not mark a sub-link from a deeper page under it", () => {
    pathname = "/account/volunteer/children/abc/claim";
    renderNav();

    expect(
      screen.getByRole("link", { name: t.volunteer.links.children }),
    ).not.toHaveAttribute("aria-current");
    pathname = "/account/volunteer";
  });
});

// «Подати заявку» belongs to the parent cabinet (Figma 136:3530) and the design
// draws it only while you are in it.
describe("AccountNav cabinet action", () => {
  it("shows the current cabinet's action, in the sidebar's drawing", () => {
    pathname = "/account/parent";
    renderNav(cabinets({ action: true }));

    expect(
      screen.getByRole("button", { name: "sidebar action" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "panel action" }),
    ).not.toBeInTheDocument();
    pathname = "/account/volunteer";
  });

  it("uses the phone menu's drawing in the panel", () => {
    pathname = "/account/parent/applications";
    renderNav(cabinets({ action: true }), null, "panel");

    expect(
      screen.getByRole("button", { name: "panel action" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "sidebar action" }),
    ).not.toBeInTheDocument();
    pathname = "/account/volunteer";
  });

  it("does not show another cabinet's action", () => {
    pathname = "/account/volunteer";
    renderNav(cabinets({ action: true }));

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
