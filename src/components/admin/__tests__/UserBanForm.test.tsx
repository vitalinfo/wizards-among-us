import { NextIntlClientProvider } from "next-intl";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../../../../messages/uk.json";
import { locale } from "@/i18n/config";
import { axe } from "@/test/axe";

const result = vi.hoisted(() => ({ current: { status: "idle" } }));
const calls = vi.hoisted(() => ({ list: [] as [string, boolean][] }));

vi.mock("@/app/admin/users/actions", () => ({
  setUserBanAction: vi.fn(async (userId: string, ban: boolean) => {
    calls.list.push([userId, ban]);
    return result.current;
  }),
}));

import { UserBanForm } from "../UserBanForm";

const t = messages.admin.users.ban;

function wrap({
  bannedSince = null,
  applicationCount = 0,
  claimCount = 0,
}: {
  bannedSince?: string | null;
  applicationCount?: number;
  claimCount?: number;
}) {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <UserBanForm
        userId="u1"
        bannedSince={bannedSince}
        applicationCount={applicationCount}
        claimCount={claimCount}
      />
    </NextIntlClientProvider>,
  );
}

describe("UserBanForm", () => {
  beforeEach(() => {
    result.current = { status: "idle" };
    calls.list = [];
  });

  it("bans someone who is not banned", async () => {
    const { container } = wrap({});
    expect(screen.getByText(t.notBanned)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: t.ban }));
    await waitFor(() => expect(calls.list).toEqual([["u1", true]]));
    expect(await axe(container)).toHaveNoViolations();
  });

  it("unbans someone who is banned, and says since when", async () => {
    wrap({ bannedSince: "14.11.2026" });
    expect(
      screen.getByText(t.bannedSince.replace("{date}", "14.11.2026")),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: t.unban }));
    await waitFor(() => expect(calls.list).toEqual([["u1", false]]));
  });

  // A ban leaves claims and applications where they are; the admin is told so
  // before pressing the button, not after.
  it("says what a ban leaves in place", () => {
    wrap({ claimCount: 2, applicationCount: 1 });
    expect(
      screen.getByText(
        t.inUse.replace("{claims}", "2").replace("{applications}", "1"),
      ),
    ).toBeInTheDocument();
  });

  it("does not warn about nothing", () => {
    wrap({});
    expect(screen.queryByText(/Блокування не звільняє/)).toBeNull();
  });

  it("reports a person who no longer exists", async () => {
    result.current = { status: "not_found" };
    wrap({});
    await userEvent.click(screen.getByRole("button", { name: t.ban }));
    expect(await screen.findByRole("alert")).toHaveTextContent(t.notFound);
  });
});
