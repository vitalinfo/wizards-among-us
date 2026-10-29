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

const REQUIRED = [
  "privacyConsent",
  "contactConsent",
  "confirmationConsent",
] as const;
const OPTIONAL = ["childWithLetterPhotoConsent", "socialMediaConsent"] as const;

// The privacy label carries a link, so its accessible name is the label text
// without the markup.
const label = (key: (typeof REQUIRED)[number] | (typeof OPTIONAL)[number]) =>
  t[key].label.replace(/<\/?link>/g, "");

describe("ConsentStep", () => {
  // Three consents gate submit; the two optional ones never do.
  it("requires the three required consents and not the optional ones", () => {
    renderStep();

    for (const key of REQUIRED) {
      expect(screen.getByRole("checkbox", { name: label(key) })).toBeRequired();
    }
    for (const key of OPTIONAL) {
      expect(
        screen.getByRole("checkbox", { name: label(key) }),
      ).not.toBeRequired();
    }
  });

  // An unticked opt-in must still RECORD a «no» — the form keeps the last
  // value of a repeated name, and the hidden «false» comes first.
  it("posts «no» for an optional consent when unticked, «yes» when ticked", async () => {
    const user = userEvent.setup();
    renderStep();

    for (const key of OPTIONAL) {
      expect(posted()[key]).toBe("false");
      await user.click(screen.getByRole("checkbox", { name: label(key) }));
      expect(posted()[key]).toBe("true");
    }
  });

  it("remembers an optional «yes» already given", () => {
    renderStep({
      childWithLetterPhotoConsent: "true",
      socialMediaConsent: "true",
    });

    for (const key of OPTIONAL) {
      expect(screen.getByRole("checkbox", { name: label(key) })).toBeChecked();
    }
  });

  // What is agreed to is the box's description, so a screen reader hears the
  // terms, not only their headline.
  it("describes each box by the text it agrees to", () => {
    renderStep();

    expect(
      screen.getByRole("checkbox", { name: label("socialMediaConsent") }),
    ).toHaveAccessibleDescription(
      expect.stringContaining(t.socialMediaConsent.body[2] as string),
    );
    expect(
      screen.getByRole("link", { name: "Політикою конфіденційності" }),
    ).toHaveAttribute("href", "/privacy");
  });

  it("has no accessibility violations", async () => {
    const { container } = renderStep();
    expect(await axe(container)).toHaveNoViolations();
  });
});
