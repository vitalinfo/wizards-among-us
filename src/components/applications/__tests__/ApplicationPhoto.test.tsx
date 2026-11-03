import { NextIntlClientProvider } from "next-intl";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import messages from "../../../../messages/uk.json";
import { locale } from "@/i18n/request";
import { axe } from "@/test/axe";

import { ApplicationPhoto } from "../ApplicationPhoto";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const t = messages.common.lightbox;
const trigger = t.open.replace("{title}", "Лист");

// jsdom has <dialog> but not its modal behaviour.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
  };
});

function wrap(props: { rotatable?: boolean; version?: number } = {}) {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ApplicationPhoto
        applicationId="a1"
        fileId="f1"
        title="Лист"
        alt="Лист дитини"
        height={412}
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

describe("ApplicationPhoto", () => {
  // The same card is the volunteer's, and they never maintain the photos.
  it("offers no turn buttons unless the page says so", async () => {
    const user = userEvent.setup();
    wrap();
    await user.click(screen.getByRole("link", { name: trigger }));

    expect(screen.queryByRole("button", { name: t.rotateRight })).toBeNull();
    expect(screen.getByRole("link", { name: trigger })).toHaveAttribute(
      "href",
      "/api/applications/a1/files/f1",
    );
  });

  it("offers them on the family's own card", async () => {
    const user = userEvent.setup();
    const { container } = wrap({ rotatable: true, version: 42 });
    await user.click(screen.getByRole("link", { name: trigger }));

    expect(
      screen.getByRole("button", { name: t.rotateLeft }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: t.rotateRight }),
    ).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  // A turned photo keeps its URL; the version is what makes the thumbnail
  // reload on the refresh that follows a turn.
  it("carries the file's version in the photo's URL", () => {
    wrap({ version: 42 });

    expect(screen.getByRole("link", { name: trigger })).toHaveAttribute(
      "href",
      "/api/applications/a1/files/f1?v=42",
    );
  });
});
