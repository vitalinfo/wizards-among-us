import { NextIntlClientProvider } from "next-intl";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);
vi.mock("next/navigation", () => ({
  usePathname: () => "/account/parent/applications",
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/app/account/(shell)/parent/applications/actions", () => ({
  deleteDraftAction: vi.fn(),
  confirmReceiptAction: vi.fn(),
}));
vi.mock("@/app/account/(shell)/parent/review/actions", () => ({
  submitReviewAction: vi.fn(async () => ({ status: "idle" })),
}));

import messages from "../../../../messages/uk.json";
import type { LoadedDialog } from "@/features/applications/dialogs";
import { formats, locale, timeZone } from "@/i18n/config";
import { axe } from "@/test/axe";

import { ApplicationDialogModal } from "../ApplicationDialogModal";

const t = messages.parent;

const application = {
  id: "a1",
  status: "claimed",
  childName: "Софійка",
} as unknown as LoadedDialog["application"];

async function renderDialog(
  loaded: LoadedDialog,
  blocked: string | null = null,
) {
  const ui = await ApplicationDialogModal({
    loaded,
    view: { tab: "claimed", page: 2 },
    blocked,
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

const closeHref = "/account/parent/applications?tab=claimed&page=2";

describe("ApplicationDialogModal", () => {
  it("asks before deleting a draft, and cancel goes back to the same view", async () => {
    await renderDialog({
      dialog: "delete",
      application: { ...application, status: "draft" },
    });

    const dialog = screen.getByRole("dialog", {
      name: t.applications.deleteDraft.title,
    });
    expect(
      within(dialog).getByRole("button", {
        name: t.applications.deleteDraft.confirm,
      }),
    ).toHaveAttribute("type", "submit");
    expect(
      within(dialog).getByRole("link", {
        name: messages.common.confirm.cancel,
      }),
    ).toHaveAttribute("href", closeHref);
  });

  // The photo is required (Vital, Phase 7): no photo, no confirming — and the
  // dialog says why rather than leaving a dead button.
  it("will not confirm the gift until there is a photo", async () => {
    await renderDialog({ dialog: "receive", application, photo: null });

    const dialog = screen.getByRole("dialog", { name: t.confirm.title });
    expect(
      within(dialog).getByRole("button", { name: t.confirm.submit }),
    ).toBeDisabled();
    expect(within(dialog).getByText(t.confirm.photoFirst)).toBeInTheDocument();
    expect(
      within(dialog).getByLabelText(new RegExp(t.confirm.photo.label)),
    ).toHaveAttribute("type", "file");
  });

  it("confirms once the photo is there", async () => {
    await renderDialog({
      dialog: "receive",
      application,
      photo: { id: "f1", kind: "confirmation", contentType: "image/jpeg" },
    });

    expect(
      screen.getByRole("button", { name: t.confirm.submit }),
    ).toBeEnabled();
    expect(screen.queryByText(t.confirm.photoFirst)).not.toBeInTheDocument();
  });

  it("says why the server refused", async () => {
    await renderDialog(
      { dialog: "receive", application, photo: null },
      "no_photo",
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      t.confirm.blocked.no_photo,
    );
  });

  it("asks for a rating in words, and the words are optional", async () => {
    await renderDialog({
      dialog: "review",
      application: { ...application, status: "fulfilled" },
    });

    const dialog = screen.getByRole("dialog", { name: t.review.title });
    const group = within(dialog).getByRole("group", {
      name: t.review.ratingLegend,
    });
    for (const label of Object.values(t.review.ratings)) {
      expect(within(group).getByRole("radio", { name: label })).toBeRequired();
    }
    const body = within(dialog).getByRole("textbox", {
      name: t.review.bodyLabel,
    });
    expect(body).not.toBeRequired();
    expect(body).toHaveAttribute("placeholder", t.review.bodyHint);
  });

  it("closes back to the same view, and has no accessibility violations", async () => {
    for (const loaded of [
      { dialog: "delete", application: { ...application, status: "draft" } },
      { dialog: "receive", application, photo: null },
      {
        dialog: "review",
        application: { ...application, status: "fulfilled" },
      },
    ] as LoadedDialog[]) {
      const { container, unmount } = await renderDialog(loaded);
      expect(
        screen.getByRole("link", { name: messages.common.close }),
      ).toHaveAttribute("href", closeHref);
      expect(await axe(container)).toHaveNoViolations();
      unmount();
    }
  });
});
