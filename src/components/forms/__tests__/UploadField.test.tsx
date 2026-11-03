import { NextIntlClientProvider } from "next-intl";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import messages from "../../../../messages/uk.json";
import { locale } from "@/i18n/request";
import { axe } from "@/test/axe";

import { UploadField, type UploadedFile } from "../UploadField";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const t = messages.parent.form.upload;
const lightbox = messages.common.lightbox;
const label = "Фото листа";
const trigger = lightbox.open.replace("{title}", label);

// jsdom has <dialog> but not its modal behaviour.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
  };
});

const uploaded: UploadedFile = {
  id: "f1",
  kind: "letter_photo",
  contentType: "image/jpeg",
  version: 42,
};

function wrap(existing?: UploadedFile) {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <UploadField
        applicationId="a1"
        kind="letter_photo"
        label={label}
        existing={existing}
        required
      />
    </NextIntlClientProvider>,
  );
}

describe("UploadField", () => {
  it("offers only the picker while nothing is uploaded", () => {
    wrap();

    expect(screen.getByLabelText(new RegExp(label))).toHaveAttribute(
      "type",
      "file",
    );
    expect(screen.getByText(t.choose)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: trigger })).toBeNull();
  });

  // The parent checks the photo they just uploaded at a glance, instead of
  // opening it to find out whether it is the right one.
  it("shows the uploaded photo as a thumbnail that opens it", async () => {
    const user = userEvent.setup();
    const { container } = wrap(uploaded);

    const link = screen.getByRole("link", { name: trigger });
    expect(within(link).getByRole("presentation")).toHaveAttribute(
      "src",
      "/api/applications/a1/files/f1?v=42",
    );
    expect(screen.getByText(t.replace)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t.remove })).toBeInTheDocument();

    await user.click(link);
    expect(screen.getByRole("dialog", { name: label })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: lightbox.rotateRight }),
    ).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  // A turned photo keeps its URL; the version is what makes the thumbnail
  // reload on the refresh that follows a turn.
  it("carries the file's version in the photo's URL", () => {
    wrap(uploaded);

    expect(screen.getByRole("link", { name: trigger })).toHaveAttribute(
      "href",
      "/api/applications/a1/files/f1?v=42",
    );
  });
});
