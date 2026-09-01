import { NextIntlClientProvider } from "next-intl";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import messages from "../../../../messages/uk.json";
import { formats, locale, timeZone } from "@/i18n/request";
import { axe } from "@/test/axe";

import { ClaimCardClient } from "../ClaimCardClient";

const t = messages.volunteer.claims;
const tFields = messages.admin.applications.fields;

const FIELDS = [
  [tFields.giftDescription, "Лялька"],
  [tFields.parentName, "Олена Коваль"],
  [tFields.currentTown, "Стрий"],
  [tFields.deliveryInformation, "Нова пошта, відділення 3"],
  [tFields.contact, "@olena"],
] as const;

function wrap(props: Partial<Parameters<typeof ClaimCardClient>[0]> = {}) {
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      formats={formats}
      timeZone={timeZone}
    >
      <ul>
        <ClaimCardClient
          childName="Марійка"
          fulfilled={false}
          claimedAt={new Date("2026-09-01T10:00:00Z")}
          fields={FIELDS}
          defaultOpen={false}
          {...props}
        />
      </ul>
    </NextIntlClientProvider>,
  );
}

describe("ClaimCardClient", () => {
  // The whole point of the change: three children used to mean three fully
  // expanded cards, every delivery address on one scroll.
  it("keeps the child identifiable while collapsed", () => {
    wrap();

    expect(screen.getByRole("heading", { name: "Марійка" })).toBeVisible();
    expect(screen.getByText(t.inProgress)).toBeVisible();
    expect(screen.getByText(/01\.09\.2026/)).toBeVisible();
  });

  // Collapsed content stays in the DOM — <details> hides it, it is not removed
  // — so the assertion has to be about the disclosure, not about presence.
  it("hides the family's details until asked", () => {
    wrap();

    const details = screen.getByRole("group");
    expect(details).not.toHaveAttribute("open");
    expect(
      within(details).getByText("Нова пошта, відділення 3"),
    ).not.toBeVisible();
  });

  it("reveals them on click", async () => {
    const user = userEvent.setup();
    wrap();

    await user.click(screen.getByText("Марійка"));

    const details = screen.getByRole("group");
    expect(details).toHaveAttribute("open");
    expect(within(details).getByText("Нова пошта, відділення 3")).toBeVisible();
    expect(within(details).getByText("@olena")).toBeVisible();
  });

  // Clicking to reveal the single thing on the page is pure friction; the page
  // decides this from rows.length === 1.
  it("starts open when it is the volunteer's only child", () => {
    wrap({ defaultOpen: true });

    expect(screen.getByRole("group")).toHaveAttribute("open");
    expect(screen.getByText("Нова пошта, відділення 3")).toBeVisible();
  });

  // Keyboard operation comes from the elements, so the assertion is that they
  // ARE those elements and that nothing has been bolted on top. jsdom does not
  // model <summary> focus or Enter-to-toggle, so the real behaviour was checked
  // in a browser instead (focus lands on the summary with no tabindex); what
  // this guards is the regression that would break it — someone replacing the
  // disclosure with a <div onClick> or adding a tabindex.
  it("uses the native disclosure rather than a hand-rolled toggle", () => {
    wrap();
    const summary = screen.getByText("Марійка").closest("summary");

    expect(summary).not.toBeNull();
    expect(summary).not.toHaveAttribute("tabindex");
    expect(summary?.parentElement?.tagName).toBe("DETAILS");
  });

  // The expand/collapse label must not be announced: <summary> already exposes
  // its own expanded state, and a second, static "expand" contradicts it once
  // the card is open.
  it("does not announce its own affordance twice", () => {
    wrap();

    expect(screen.getByText(t.expand)).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText(t.collapse)).toHaveAttribute("aria-hidden", "true");
  });

  it("says the mother's dream is done once it is", () => {
    wrap({ fulfilled: true, defaultOpen: true });

    expect(screen.getByText(t.fulfilled)).toBeVisible();
    expect(screen.getByText(t.thanks)).toBeVisible();
    expect(screen.queryByText(t.releaseNote)).toBeNull();
  });

  it("renders the photos it is handed", () => {
    wrap({ defaultOpen: true, photos: <p>Фото листа</p> });

    expect(screen.getByText("Фото листа")).toBeVisible();
  });

  it("has no accessibility violations, open or closed", async () => {
    const closed = wrap();
    expect(await axe(closed.container)).toHaveNoViolations();
    closed.unmount();

    const open = wrap({ defaultOpen: true });
    expect(await axe(open.container)).toHaveNoViolations();
  });
});
