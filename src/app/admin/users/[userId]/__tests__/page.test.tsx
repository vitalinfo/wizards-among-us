import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { userApplicationsHref } from "@/features/applications/moderationFilter";
import type { AdminUserRow } from "@/features/users/adminQueries";
import { axe } from "@/test/axe";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);
// The session and the person are database reads; what is under test is how
// the page draws them.
vi.mock("@/lib/auth/session", () => ({
  getSessionActor: async () => ({
    kind: "admin",
    id: "a1",
    email: "admin@example.com",
  }),
}));
const data = vi.hoisted(() => ({ user: null as AdminUserRow | null }));
vi.mock("@/features/users/adminQueries", () => ({
  getUserForAdmin: async () => data.user,
}));
// AdminNav is async (RTL cannot render it nested); the two forms have their
// own specs and pull in server actions.
vi.mock("@/components/admin/AdminNav", () => ({ AdminNav: () => null }));
vi.mock("@/components/admin/UserNoteForm", () => ({
  UserNoteForm: () => null,
}));
vi.mock("@/components/admin/UserRolesForm", () => ({
  UserRolesForm: () => null,
}));
// ConfirmModal is async (RTL cannot render it nested) and has no spec of its
// own to lean on here; this stand-in draws what the page hands it, so what is
// under test is the page's decision — when to ask, what to say, what the
// confirm button is bound to.
vi.mock("@/components/ui/ConfirmModal", () => ({
  ConfirmModal: (props: {
    action: () => Promise<void>;
    title: string;
    message: string;
    confirmLabel: string;
    cancelHref: string;
  }) => (
    <div role="dialog" aria-label={props.title}>
      <p>{props.message}</p>
      <a href={props.cancelHref}>cancel</a>
      <button type="button" onClick={() => void props.action()}>
        {props.confirmLabel}
      </button>
    </div>
  ),
}));
const banAction = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@/app/admin/users/actions", () => ({
  setUserBanAction: banAction,
}));

import messages from "../../../../../../messages/uk.json";

import AdminUserPage from "../page";

const t = messages.admin.users;
const USER_ID = "d75c6aa0-d3c3-468b-bffa-6ca82a25a1da";

function user(overrides: Partial<AdminUserRow>): AdminUserRow {
  return {
    id: USER_ID,
    username: "olena",
    firstName: "Олена",
    lastName: "Коваль",
    phone: null,
    role: ["parent", "volunteer"],
    note: null,
    bannedAt: null,
    applicationCount: 0,
    claimCount: 0,
    createdAt: new Date("2026-11-03T08:33:41Z"),
    ...overrides,
  };
}

async function renderPage(
  searchParams: { q?: string; page?: string; confirmBan?: string } = {},
) {
  const ui = await AdminUserPage({
    params: Promise.resolve({ userId: USER_ID }),
    searchParams: Promise.resolve(searchParams),
  });
  // UserBanSection reads its copy through useTranslations.
  return render(
    <NextIntlClientProvider locale="uk" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("the admin user page", () => {
  it("links each count to that person's applications", async () => {
    data.user = user({ applicationCount: 3, claimCount: 2 });
    const { container } = await renderPage();

    expect(
      screen.getByRole("link", {
        name: t.applicationsFor
          .replace("{name}", "Олена Коваль")
          .replace("{count}", "3"),
      }),
    ).toHaveAttribute("href", userApplicationsHref("parent", USER_ID));
    expect(
      screen.getByRole("link", {
        name: t.claimsFor
          .replace("{name}", "Олена Коваль")
          .replace("{count}", "2"),
      }),
    ).toHaveAttribute("href", userApplicationsHref("claimedBy", USER_ID));
    expect(await axe(container)).toHaveNoViolations();
  });

  it("links to everything this person did in the audit log", async () => {
    data.user = user({});
    await renderPage();

    expect(screen.getByRole("link", { name: t.log })).toHaveAttribute(
      "href",
      `/admin/audit?actorType=user&actor=${USER_ID}`,
    );
  });

  // A link to an empty list is a tab stop that leads nowhere.
  it("leaves a zero count as plain text", async () => {
    data.user = user({ applicationCount: 0, claimCount: 0 });
    await renderPage();

    const applicationsLink = new RegExp(t.applicationsFor.split(":")[0]);
    const claimsLink = new RegExp(t.claimsFor.split(":")[0]);
    expect(
      screen.queryByRole("link", { name: applicationsLink }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: claimsLink }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("0")).toHaveLength(2);
  });

  describe("ban", () => {
    const b = t.ban;

    // The page never bans on one click: the control only raises the prompt.
    it("asks first — the control is a link to the prompt, not a write", async () => {
      data.user = user({});
      await renderPage({ q: "ole" });

      expect(screen.getByText(b.notBanned)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: b.ban })).toHaveAttribute(
        "href",
        `/admin/users/${USER_ID}?q=ole&confirmBan=1#ban`,
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByRole("main")).not.toHaveAttribute("inert");
    });

    it("raises the ban prompt, naming the person, over an inert page", async () => {
      banAction.mockClear();
      data.user = user({});
      await renderPage({ q: "ole", confirmBan: "1" });

      const dialog = screen.getByRole("dialog", { name: b.confirmBanTitle });
      expect(dialog).toHaveTextContent(
        b.confirmBanMessage.replace("{name}", "Олена Коваль"),
      );
      // Cancel goes back to this page, list view intact, without the prompt.
      expect(screen.getByRole("link", { name: "cancel" })).toHaveAttribute(
        "href",
        `/admin/users/${USER_ID}?q=ole#ban`,
      );
      expect(document.querySelector("main")).toHaveAttribute("inert");

      await userEvent.click(screen.getByRole("button", { name: b.ban }));
      expect(banAction).toHaveBeenCalledWith(
        USER_ID,
        true,
        `/admin/users/${USER_ID}?q=ole#ban`,
      );
    });

    it("asks to unban someone who is banned", async () => {
      banAction.mockClear();
      data.user = user({ bannedAt: new Date("2026-11-14T10:00:00Z") });
      await renderPage({ confirmBan: "1" });

      expect(
        screen.getByRole("dialog", { name: b.confirmUnbanTitle }),
      ).toHaveTextContent(
        b.confirmUnbanMessage.replace("{name}", "Олена Коваль"),
      );
      await userEvent.click(screen.getByRole("button", { name: b.unban }));
      expect(banAction).toHaveBeenCalledWith(
        USER_ID,
        false,
        `/admin/users/${USER_ID}#ban`,
      );
    });

    // A ban leaves claims and applications where they are; the admin is told
    // so before asking, not after.
    it("says what a ban leaves in place", async () => {
      data.user = user({ claimCount: 2, applicationCount: 1 });
      await renderPage();
      expect(
        screen.getByText(
          b.inUse.replace("{claims}", "2").replace("{applications}", "1"),
        ),
      ).toBeInTheDocument();
    });

    it("says since when someone is banned", async () => {
      data.user = user({ bannedAt: new Date("2026-11-14T10:00:00Z") });
      const { container } = await renderPage();
      expect(screen.getByText(/^Заблоковано з /)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: b.unban })).toBeInTheDocument();
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
