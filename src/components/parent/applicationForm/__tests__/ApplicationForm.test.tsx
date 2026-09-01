import { NextIntlClientProvider } from "next-intl";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../../../../../messages/uk.json";
import { locale } from "@/i18n/request";
import type { SaveDraftState } from "@/features/applications/formState";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

const saveResult = vi.hoisted(() => ({
  current: { status: "saved", errors: {} } as SaveDraftState,
}));

vi.mock("@/app/parent/applications/[applicationId]/actions", () => ({
  saveApplicationDraft: vi.fn(async () => saveResult.current),
  submitApplicationAction: vi.fn(async () => ({
    status: "idle",
    errors: {},
    blockReason: null,
  })),
}));

import { ApplicationForm } from "../ApplicationForm";
import { DeliveryStep } from "../DeliveryStep";
import { GiftStep } from "../GiftStep";

const gift = messages.parent.form.steps.gift;
const errors = messages.parent.form.errors;

const application = {
  id: "app-1",
  campaignId: "campaign-1",
  status: "draft",
  typeFields: null,
} as never;

const steps = [
  { key: "gift", Component: GiftStep, fields: ["giftDescription"] },
  { key: "delivery", Component: DeliveryStep, fields: [] },
] as never;

function renderForm() {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ApplicationForm
        application={application}
        contact={{ method: "telegram", value: "@olena" }}
        giftPriceCap={null}
        files={{}}
        turnstileSiteKey={null}
        steps={steps}
      />
    </NextIntlClientProvider>,
  );
}

async function fillGiftStep(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByLabelText(new RegExp(gift.giftDescription.label)),
    "Лялька",
  );
  await user.type(
    screen.getByLabelText(new RegExp(gift.giftUrls.label)),
    "not-a-url",
  );
  await user.type(
    screen.getByLabelText(new RegExp(gift.giftPrice.label)),
    "700",
  );
}

beforeEach(() => {
  saveResult.current = { status: "saved", errors: {} };
});

describe("ApplicationForm", () => {
  // React 19 resets an uncontrolled form once its action finishes. On a
  // rejected step the parent stays put and used to find every field emptied —
  // one bad link cost them the whole step.
  it("keeps what the parent typed when the step is rejected", async () => {
    const user = userEvent.setup();
    saveResult.current = {
      status: "invalid",
      errors: { giftUrls: "invalid_url" },
    };
    renderForm();

    await fillGiftStep(user);
    await user.click(
      screen.getByRole("button", { name: messages.parent.form.next }),
    );

    await screen.findByText(messages.parent.form.saveError);
    expect(
      screen.getByLabelText(new RegExp(gift.giftDescription.label)),
    ).toHaveValue("Лялька");
    expect(screen.getByLabelText(new RegExp(gift.giftUrls.label))).toHaveValue(
      "not-a-url",
    );
    expect(screen.getByLabelText(new RegExp(gift.giftPrice.label))).toHaveValue(
      700,
    );
  });

  // The generic «Некоректне значення» doesn't tell a parent WHICH of the three
  // things they entered is wrong.
  it("names the broken link rather than reporting a generic problem", async () => {
    const user = userEvent.setup();
    saveResult.current = {
      status: "invalid",
      errors: { giftUrls: "invalid_url" },
    };
    renderForm();

    await fillGiftStep(user);
    await user.click(
      screen.getByRole("button", { name: messages.parent.form.next }),
    );

    expect(await screen.findByText(errors.invalid_url)).toBeVisible();
    expect(screen.queryByText(errors.invalid)).toBeNull();
  });

  it("advances on a successful save without carrying the answers forward", async () => {
    const user = userEvent.setup();
    renderForm();

    await fillGiftStep(user);
    await user.click(
      screen.getByRole("button", { name: messages.parent.form.next }),
    );

    expect(
      await screen.findByText(
        messages.parent.form.stepOf
          .replace("{current}", "2")
          .replace("{total}", "2"),
      ),
    ).toBeVisible();
    expect(
      screen.queryByLabelText(new RegExp(gift.giftDescription.label)),
    ).toBeNull();
  });
});
