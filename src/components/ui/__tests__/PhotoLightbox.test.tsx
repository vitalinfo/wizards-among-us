import { NextIntlClientProvider } from "next-intl";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import messages from "../../../../messages/uk.json";
import { locale } from "@/i18n/request";
import { axe } from "@/test/axe";

import { PhotoLightbox } from "../PhotoLightbox";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

afterEach(() => {
  vi.restoreAllMocks();
  refresh.mockReset();
});

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

describe("PhotoLightbox turning", () => {
  function wrapRotatable() {
    return render(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <PhotoLightbox
          href="/api/file/1?v=5"
          rotateHref="/api/file/1/rotate"
          title="Фото листа"
          alt="Лист дитини"
        >
          <span>Переглянути</span>
        </PhotoLightbox>
      </NextIntlClientProvider>,
    );
  }

  async function open() {
    const user = userEvent.setup();
    await user.click(screen.getByRole("link", { name: trigger }));
    return user;
  }

  // The lightbox also opens photos for volunteers, who see these photos but
  // never maintain them.
  it("offers no turn buttons unless asked to", async () => {
    wrap();
    await open();

    expect(screen.queryByRole("group", { name: t.rotate })).toBeNull();
    expect(screen.queryByRole("button", { name: t.rotateRight })).toBeNull();
  });

  it("turns the photo and shows the new pixels", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json({ ok: true }));
    wrapRotatable();
    const user = await open();

    await user.click(screen.getByRole("button", { name: t.rotateRight }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/file/1/rotate",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ direction: "right" }),
      }),
    );
    // Same file, new URL: otherwise the browser keeps the photo it has.
    await waitFor(() =>
      expect(screen.getByAltText("Лист дитини")).toHaveAttribute(
        "src",
        "/api/file/1?v=5&t=1",
      ),
    );
    expect(refresh).toHaveBeenCalled();

    // Until the turned photo has arrived, another turn would act on a photo
    // nobody has seen yet. (`load` is not something user-event models.)
    expect(screen.getByRole("button", { name: t.rotateLeft })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(t.rotating);
    fireEvent.load(screen.getByAltText("Лист дитини"));
    expect(screen.getByRole("button", { name: t.rotateLeft })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: t.rotateLeft }));

    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/file/1/rotate",
      expect.objectContaining({ body: JSON.stringify({ direction: "left" }) }),
    );
    await waitFor(() =>
      expect(screen.getByAltText("Лист дитини")).toHaveAttribute(
        "src",
        "/api/file/1?v=5&t=2",
      ),
    );
  });

  it("says so when the turn fails, and keeps the photo it had", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ error: "not_found" }, { status: 404 }),
    );
    wrapRotatable();
    const user = await open();

    await user.click(screen.getByRole("button", { name: t.rotateRight }));

    expect(await screen.findByRole("alert")).toHaveTextContent(t.rotateFailed);
    expect(screen.getByAltText("Лист дитини")).toHaveAttribute(
      "src",
      "/api/file/1?v=5",
    );
    expect(refresh).not.toHaveBeenCalled();
  });

  it("says so when the network fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("offline"));
    wrapRotatable();
    const user = await open();

    await user.click(screen.getByRole("button", { name: t.rotateLeft }));

    expect(await screen.findByRole("alert")).toHaveTextContent(t.rotateFailed);
  });

  it("has no accessibility violations with the turn buttons", async () => {
    const { container } = wrapRotatable();
    await open();

    expect(await axe(container)).toHaveNoViolations();
  });
});
