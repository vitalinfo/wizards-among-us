import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

// The server action is the boundary; what is under test is that every drawing
// of the button actually posts it.
vi.mock("@/app/account/(shell)/parent/applications/actions", () => ({
  startApplication: vi.fn(),
}));

import messages from "../../../../messages/uk.json";
import { axe } from "@/test/axe";
import {
  StartApplicationButton,
  type StartApplicationVariant,
} from "../StartApplicationButton";

const VARIANTS: StartApplicationVariant[] = ["hero", "sidebar", "panel"];

function renderButton(variant: StartApplicationVariant) {
  return render(
    <NextIntlClientProvider locale="uk" messages={messages}>
      <StartApplicationButton variant={variant} />
    </NextIntlClientProvider>,
  );
}

describe("StartApplicationButton", () => {
  // Starting an application creates the draft, so it is a POST — a form and a
  // submit button — in every one of the three places the design draws it. A
  // link here would be a GET that writes.
  it.each(VARIANTS)(
    "the %s drawing is a submit button inside a form",
    (variant) => {
      renderButton(variant);

      const button = screen.getByRole("button", {
        name: messages.account.parent.cta,
      });
      expect(button).toHaveAttribute("type", "submit");
      expect(button.closest("form")).not.toBeNull();
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    },
  );

  // The arrow and the plus are decoration; the name is the words.
  it.each(VARIANTS)("the %s drawing has no violations", async (variant) => {
    const { container } = renderButton(variant);
    expect(await axe(container)).toHaveNoViolations();
  });
});
