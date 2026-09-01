import { NextIntlClientProvider } from "next-intl";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it } from "vitest";

import messages from "../../../../messages/uk.json";
import { locale } from "@/i18n/request";
import { axe } from "@/test/axe";

import { PhotoLightbox } from "../PhotoLightbox";

const t = messages.common.lightbox;
// The trigger's accessible name comes from PhotoLightbox itself: a thumbnail
// trigger has an empty alt, so without this the link announced nothing.
const trigger = t.open.replace("{title}", "Фото листа");

// jsdom implements <dialog> but not the modal behaviour, so showModal/close are
// stubbed to the `open` attribute the component and these assertions rely on.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
  };
});

function wrap() {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <PhotoLightbox href="/api/file/1" title="Фото листа" alt="Лист дитини">
        <span>Переглянути</span>
      </PhotoLightbox>
    </NextIntlClientProvider>,
  );
}

describe("PhotoLightbox", () => {
  // The trigger is a real link to the file, so the photo is reachable with no
  // JavaScript and before hydration. That fallback is the whole reason this may
  // be a client component.
  it("is a plain link to the file underneath", () => {
    wrap();
    const link = screen.getByRole("link", { name: trigger });

    expect(link).toHaveAttribute("href", "/api/file/1");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("opens the photo in place instead of navigating", async () => {
    const user = userEvent.setup();
    wrap();

    await user.click(screen.getByRole("link", { name: trigger }));

    const dialog = screen.getByRole("dialog", { name: "Фото листа" });
    expect(dialog).toBeVisible();
    expect(screen.getByAltText("Лист дитини")).toHaveAttribute(
      "src",
      "/api/file/1",
    );
  });

  it("closes again", async () => {
    const user = userEvent.setup();
    wrap();

    await user.click(screen.getByRole("link", { name: trigger }));
    await user.click(screen.getByRole("button", { name: t.close }));

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  // Someone deliberately asking for a new tab should get one.
  it("leaves a modifier-click alone", async () => {
    const user = userEvent.setup();
    wrap();

    await user.keyboard("{Meta>}");
    await user.click(screen.getByRole("link", { name: trigger }));
    await user.keyboard("{/Meta}");

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("still offers the new tab from inside the overlay", async () => {
    const user = userEvent.setup();
    wrap();
    await user.click(screen.getByRole("link", { name: trigger }));

    expect(screen.getByRole("link", { name: t.openInTab })).toHaveAttribute(
      "href",
      "/api/file/1",
    );
  });

  it("has no accessibility violations", async () => {
    const user = userEvent.setup();
    const { container } = wrap();
    await user.click(screen.getByRole("link", { name: trigger }));

    expect(await axe(container)).toHaveNoViolations();
  });
});
