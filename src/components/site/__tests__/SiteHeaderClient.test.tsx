import { NextIntlClientProvider } from "next-intl";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import messages from "../../../../messages/uk.json";
import { SITE } from "@/lib/site";
import { SiteHeaderClient } from "../SiteHeaderClient";

type Account = Parameters<typeof SiteHeaderClient>[0]["account"];

function renderHeader(account: Account = null) {
  return render(
    <NextIntlClientProvider locale="uk" messages={messages}>
      <SiteHeaderClient account={account} />
    </NextIntlClientProvider>,
  );
}

// The design draws ONE round button in the header, signed in or out, with no
// name beside it. Only where it goes changes — so the destination and the
// accessible name are the whole of this component's auth behaviour, and the
// name is the only thing a screen-reader user has to tell the states apart.
describe("SiteHeaderClient account button", () => {
  it("offers sign-in when nobody is signed in", () => {
    renderHeader(null);

    expect(
      screen.getByRole("link", { name: messages.common.login }),
    ).toHaveAttribute("href", "/login");
  });

  it("leads a signed-in person to their account", () => {
    renderHeader({ href: "/account/parent/applications", labelKey: "account" });

    expect(
      screen.getByRole("link", { name: messages.common.account }),
    ).toHaveAttribute("href", "/account/parent/applications");
    expect(
      screen.queryByRole("link", { name: messages.common.login }),
    ).not.toBeInTheDocument();
  });

  // An admin holds a session but is not a `user`. Offering them «Увійти» sent
  // them to a page they were already past — and, with the parent pages' guard,
  // into an infinite redirect loop.
  it("leads an admin to their own panel", () => {
    renderHeader({ href: "/admin", labelKey: "adminPanel" });

    expect(
      screen.getByRole("link", { name: messages.common.adminPanel }),
    ).toHaveAttribute("href", "/admin");
    expect(
      screen.queryByRole("link", { name: messages.common.login }),
    ).not.toBeInTheDocument();
  });

  // The button carries no visible text in any state, so a missing or stale
  // aria-label leaves a screen-reader user with an unnamed link in the header.
  it("names the button in every state and never shows a label", () => {
    for (const [account, name] of [
      [null, messages.common.login],
      [
        { href: "/account/parent/applications", labelKey: "account" } as const,
        messages.common.account,
      ],
      [
        { href: "/admin", labelKey: "adminPanel" } as const,
        messages.common.adminPanel,
      ],
    ] as const) {
      const { unmount } = renderHeader(account);
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
      expect(screen.queryByText(name)).not.toBeInTheDocument();
      unmount();
    }
  });

  // It was the only control that signed anyone out anywhere; it now lives on
  // the page the button leads to. A regression here would put a dead or
  // duplicated control back in the header.
  it("no longer signs anyone out", () => {
    renderHeader({ href: "/account/parent/applications", labelKey: "account" });

    expect(
      screen.queryByRole("button", { name: messages.common.signOut }),
    ).not.toBeInTheDocument();
  });

  // Nothing about the person reaches the browser any more: the server hands
  // this island a destination and nothing else, and the props enforce it. This
  // guards the rendering rather than the type — the header used to print
  // «@username», and the only «@» left in it should be the project's own
  // address in the mobile menu.
  it("prints no handle belonging to anyone", () => {
    const { container } = renderHeader({
      href: "/account/volunteer/claims",
      labelKey: "account",
    });

    const ats = [...container.querySelectorAll("*")]
      .filter((el) => el.children.length === 0)
      .map((el) => el.textContent ?? "")
      .filter((text) => text.includes("@"));
    expect(ats).toEqual([SITE.email]);
  });
});

// «Контакти» used to be an anchor to the footer. It is a page now, and the
// header is the only route to it — it is deliberately not in SITE_NAV.
describe("SiteHeaderClient contacts link", () => {
  it("points at the contacts page from both the bar and the mobile menu", () => {
    renderHeader(null);

    const links = screen.getAllByRole("link", {
      name: messages.common.nav.contacts,
    });
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/contacts");
    }
  });
});
