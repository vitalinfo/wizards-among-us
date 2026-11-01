import { NextIntlClientProvider } from "next-intl";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);
vi.mock("@/app/volunteer/actions", () => ({
  toggleProcessedAction: vi.fn(),
}));

import messages from "../../../../messages/uk.json";
import type { ClaimDialog } from "@/features/claims/claimTabs";
import { locale } from "@/i18n/config";
import { axe } from "@/test/axe";

import { ClaimDialogModal } from "../ClaimDialogModal";

const t = messages.volunteer.claims.processDialog;
const view = { tab: "active", page: 2, per: 10 } as const;
const list = "/account/volunteer/claims?tab=active&page=2";

async function renderDialog(dialog: ClaimDialog) {
  const ui = await ClaimDialogModal({
    dialog,
    applicationId: "a1",
    childName: "Софійка",
    view,
  });
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("ClaimDialogModal", () => {
  for (const dialog of ["process", "unprocess"] as const) {
    it(`asks before ${dialog === "process" ? "setting" : "taking off"} the mark`, async () => {
      await renderDialog(dialog);

      expect(
        screen.getByRole("dialog", { name: t[dialog].title }),
      ).toHaveAccessibleDescription(
        t[dialog].body.replace("{name}", "Софійка"),
      );
      expect(
        screen.getByRole("button", { name: t[dialog].confirm }),
      ).toBeInTheDocument();
      // Cancel and × both go back to the same view of the list, doing nothing.
      expect(
        screen.getByRole("link", { name: messages.common.confirm.cancel }),
      ).toHaveAttribute("href", list);
      expect(
        screen.getByRole("link", { name: messages.common.close }),
      ).toHaveAttribute("href", list);
    });
  }

  // The dialog itself takes focus, not the confirm button: Enter must not
  // complete an action nobody read.
  it("does not focus the confirm button", async () => {
    await renderDialog("process");
    expect(
      screen.getByRole("button", { name: t.process.confirm }),
    ).not.toHaveFocus();
  });

  it("has no accessibility violations", async () => {
    const { container } = await renderDialog("unprocess");
    expect(await axe(container)).toHaveNoViolations();
  });
});
