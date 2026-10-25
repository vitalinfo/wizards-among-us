import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

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
  // Every drawing leads to the briefing first — it is a LINK, and creates
  // nothing. The draft is created by the briefing's own form.
  it.each(VARIANTS)("the %s drawing links to the briefing", (variant) => {
    renderButton(variant);

    expect(
      screen.getByRole("link", { name: messages.account.parent.cta }),
    ).toHaveAttribute("href", "/account/parent/applications/new");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  // The arrow and the plus are decoration; the name is the words.
  it.each(VARIANTS)("the %s drawing has no violations", async (variant) => {
    const { container } = renderButton(variant);
    expect(await axe(container)).toHaveNoViolations();
  });
});
