import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeAll, describe, expect, it, vi } from "vitest";

import messages from "../../../../messages/uk.json";
import { ConfirmSubmitButton } from "../ConfirmSubmitButton";

// jsdom implements <dialog> but not showModal()/close() in every version, so
// back them with the open attribute. This is the environment, not the component.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function showModal(
    this: HTMLDialogElement,
  ) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function close(
    this: HTMLDialogElement,
  ) {
    this.open = false;
  };
});

function renderButton(action: () => Promise<void>) {
  return render(
    <NextIntlClientProvider locale="uk" messages={messages}>
      <ConfirmSubmitButton
        action={action}
        label="Архівувати"
        title="Архівувати цю кампанію?"
        message="Кампанія зникне зі списків."
        confirmLabel="Архівувати"
      />
    </NextIntlClientProvider>,
  );
}

describe("ConfirmSubmitButton", () => {
  it("does not act until the confirmation is accepted", async () => {
    const action = vi.fn(async () => {});
    const user = userEvent.setup();
    renderButton(action);

    // The dialog isn't shown, so its contents aren't reachable yet.
    expect(
      screen.queryByRole("dialog", { name: "Архівувати цю кампанію?" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Архівувати" }));
    const dialog = await screen.findByRole("dialog", {
      name: "Архівувати цю кампанію?",
    });
    // Opening the dialog must not have run the action.
    expect(action).not.toHaveBeenCalled();
    expect(dialog).toHaveTextContent("Кампанія зникне зі списків.");
  });

  it("runs the action once confirmed", async () => {
    const action = vi.fn(async () => {});
    const user = userEvent.setup();
    renderButton(action);

    await user.click(screen.getByRole("button", { name: "Архівувати" }));
    const dialog = await screen.findByRole("dialog");
    const { getByRole } = within(dialog);
    await user.click(getByRole("button", { name: "Архівувати" }));

    expect(action).toHaveBeenCalledTimes(1);
  });

  it("cancelling closes the dialog and leaves the action unrun", async () => {
    const action = vi.fn(async () => {});
    const user = userEvent.setup();
    renderButton(action);

    await user.click(screen.getByRole("button", { name: "Архівувати" }));
    await user.click(
      screen.getByRole("button", { name: messages.common.confirm.cancel }),
    );

    expect(action).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // Regression: the trigger used to be type="button" with an onClick, which
  // made it a silent no-op whenever the client JS wasn't there — a stale dev
  // bundle turned every admin action into a dead button with nothing to
  // explain it. It is now a real submit button that the handler intercepts, so
  // a broken-JS click still acts.
  it("submits directly when the dialog cannot be opened", async () => {
    const original = HTMLDialogElement.prototype.showModal;
    // Simulate no dialog support / no hydration of the dialog element.
    // @ts-expect-error deliberately removing the method for this test
    HTMLDialogElement.prototype.showModal = undefined;
    try {
      const action = vi.fn(async () => {});
      const user = userEvent.setup();
      renderButton(action);

      await user.click(screen.getByRole("button", { name: "Архівувати" }));

      expect(action).toHaveBeenCalledTimes(1);
    } finally {
      HTMLDialogElement.prototype.showModal = original;
    }
  });

  it("keeps the trigger a submit button so it degrades to a plain form post", () => {
    renderButton(vi.fn(async () => {}));
    expect(screen.getByRole("button", { name: "Архівувати" })).toHaveAttribute(
      "type",
      "submit",
    );
  });

  // The dialog's accessible name is what a screen reader announces on open.
  it("names the dialog", async () => {
    const user = userEvent.setup();
    renderButton(vi.fn(async () => {}));
    await user.click(screen.getByRole("button", { name: "Архівувати" }));
    expect(
      await screen.findByRole("dialog", { name: "Архівувати цю кампанію?" }),
    ).toBeInTheDocument();
  });
});
