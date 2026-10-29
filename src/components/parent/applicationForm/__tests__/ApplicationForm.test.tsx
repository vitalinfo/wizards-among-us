import { NextIntlClientProvider } from "next-intl";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../../../../../messages/uk.json";
import { locale } from "@/i18n/request";
import type {
  SaveDraftState,
  SubmitState,
} from "@/features/applications/formState";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

const saveResult = vi.hoisted(() => ({
  current: { status: "saved", errors: {} } as SaveDraftState,
}));
const submitResult = vi.hoisted(() => ({
  current: { status: "idle", errors: {}, blockReason: null } as SubmitState,
}));

vi.mock(
  "@/app/account/(shell)/parent/applications/[applicationId]/actions",
  () => ({
    saveApplicationDraft: vi.fn(async () => saveResult.current),
    submitApplicationAction: vi.fn(async () => submitResult.current),
  }),
);

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
  {
    key: "gift",
    Component: GiftStep,
    fields: ["giftDescription", "giftUrls", "giftPrice"],
  },
  { key: "delivery", Component: DeliveryStep, fields: [] },
] as never;

function renderForm() {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ApplicationForm
        application={application}
        contact={{ method: "telegram", value: "@olena" }}
        defaultParentName={null}
        giftPriceCap={null}
        files={{}}
        turnstileSiteKey={null}
        steps={steps}
      />
    </NextIntlClientProvider>,
  );
}

async function fillGiftStep(
  user: ReturnType<typeof userEvent.setup>,
  url = "not-a-url",
) {
  await user.type(
    screen.getByLabelText(new RegExp(gift.giftDescription.label)),
    "Лялька",
  );
  await user.type(screen.getByLabelText(new RegExp(gift.giftUrls.label)), url);
  await user.type(
    screen.getByLabelText(new RegExp(gift.giftPrice.label)),
    "700",
  );
}

beforeEach(() => {
  saveResult.current = { status: "saved", errors: {} };
  submitResult.current = { status: "idle", errors: {}, blockReason: null };
});

async function reachLastStepAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
) {
  await fillGiftStep(user, "https://rozetka.com.ua/doll");
  await user.click(
    screen.getByRole("button", { name: messages.parent.form.next }),
  );
  await user.type(
    await screen.findByLabelText(
      new RegExp(messages.parent.form.steps.delivery.deliveryInformation.label),
    ),
    "Нова пошта, відділення 5",
  );
  await user.click(
    screen.getByRole("button", {
      name: messages.parent.form.steps.consent.submit,
    }),
  );
}

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

    // The stepper says where the parent is — aria-current on the step, not
    // just its colour.
    expect(
      await screen.findByRole("listitem", { current: "step" }),
    ).toHaveTextContent(messages.parent.form.steps.delivery.title);
    expect(
      screen.queryByLabelText(new RegExp(gift.giftDescription.label)),
    ).toBeNull();
  });

  // The submit validates the whole application. A field from an earlier step
  // used to fail it on the last step, where that field isn't shown — «Перевірте
  // виділені поля» with nothing highlighted.
  it("takes the parent back to the step whose field failed the submit", async () => {
    const user = userEvent.setup();
    submitResult.current = {
      status: "invalid",
      errors: { giftPrice: "gift_price_over_cap" },
      blockReason: null,
    };
    renderForm();

    await reachLastStepAndSubmit(user);

    await waitFor(() =>
      expect(
        screen.getByRole("listitem", { current: "step" }),
      ).toHaveTextContent(messages.parent.form.steps.gift.title),
    );
    expect(screen.getByText(messages.parent.form.saveError)).toBeVisible();
    expect(
      screen.getByLabelText(new RegExp(gift.giftPrice.label)),
    ).toHaveAccessibleDescription(new RegExp(errors.out_of_range));
  });

  it("stays on the last step when the failure belongs there", async () => {
    const user = userEvent.setup();
    submitResult.current = {
      status: "invalid",
      errors: { turnstileToken: "captcha" },
      blockReason: null,
    };
    renderForm();

    await reachLastStepAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(errors.captcha);
    expect(screen.getByRole("listitem", { current: "step" })).toHaveTextContent(
      messages.parent.form.steps.delivery.title,
    );
  });

  it("drops the submit error once the step it pointed at is saved", async () => {
    const user = userEvent.setup();
    submitResult.current = {
      status: "invalid",
      errors: { giftPrice: "gift_price_over_cap" },
      blockReason: null,
    };
    renderForm();

    await reachLastStepAndSubmit(user);
    await screen.findByText(messages.parent.form.saveError);
    // The stub application has nothing saved, so the step comes back empty.
    await fillGiftStep(user, "https://rozetka.com.ua/doll");
    await user.click(
      screen.getByRole("button", { name: messages.parent.form.next }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("listitem", { current: "step" }),
      ).toHaveTextContent(messages.parent.form.steps.delivery.title),
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
