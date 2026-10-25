import { NextIntlClientProvider } from "next-intl";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

// The captcha loads a third-party script; it is not what is under test.
vi.mock("@/components/forms/TurnstileWidget", () => ({
  TurnstileWidget: () => null,
}));

import messages from "../../../../../messages/uk.json";
import { locale } from "@/i18n/request";
import { axe } from "@/test/axe";

import { ConsentStep } from "../ConsentStep";

const t = messages.parent.form.steps.consent;

function renderStep(values: Record<string, string | undefined> = {}) {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <form aria-label="step">
        <ConsentStep values={values} errors={{}} turnstileSiteKey={null} />
      </form>
    </NextIntlClientProvider>,
  );
}

const posted = () =>
  Object.fromEntries(
    new FormData(
      screen.getByRole("form", { name: "step" }) as HTMLFormElement,
    ).entries(),
  );

describe("ConsentStep", () => {
  // The data consent gates submit; the social-media one never does.
  it("requires the data consent and not the social-media one", () => {
    renderStep();

    expect(
      screen.getByRole("checkbox", { name: new RegExp(t.consent.label) }),
    ).toBeRequired();
    expect(
      screen.getByRole("checkbox", {
        name: t.socialMediaConsent.label,
      }),
    ).not.toBeRequired();
  });

  // An unticked opt-in must still RECORD a «no» — the form keeps the last
  // value of a repeated name, and the hidden «false» comes first.
  it("posts «no» for social media when unticked, «yes» when ticked", async () => {
    const user = userEvent.setup();
    renderStep();

    expect(posted().socialMediaConsent).toBe("false");

    await user.click(
      screen.getByRole("checkbox", { name: t.socialMediaConsent.label }),
    );
    expect(posted().socialMediaConsent).toBe("true");
  });

  it("remembers a social-media «yes» already given", () => {
    renderStep({ socialMediaConsent: "true" });

    expect(
      screen.getByRole("checkbox", { name: t.socialMediaConsent.label }),
    ).toBeChecked();
  });

  // What is agreed to is the box's description, so a screen reader hears the
  // terms, not only their headline.
  it("describes each box by the text it agrees to", () => {
    renderStep();

    expect(
      screen.getByRole("checkbox", { name: t.socialMediaConsent.label }),
    ).toHaveAccessibleDescription(
      expect.stringContaining(t.socialMediaConsent.body[2]),
    );
    expect(screen.getByRole("link", { name: "згоду" })).toHaveAttribute(
      "href",
      "/privacy",
    );
  });

  it("has no accessibility violations", async () => {
    const { container } = renderStep();
    expect(await axe(container)).toHaveNoViolations();
  });
});
