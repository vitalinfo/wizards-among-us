import { NextIntlClientProvider } from "next-intl";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);

import messages from "../../../../messages/uk.json";
import { locale } from "@/i18n/config";
import { axe } from "@/test/axe";

import { WizardSection } from "../WizardSection";

const t = messages.parent.applications.wizard;

async function renderSection(props: Parameters<typeof WizardSection>[0]) {
  const ui = await WizardSection(props);
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("WizardSection", () => {
  it("names the volunteer under its own heading", async () => {
    await renderSection({
      name: "Олександр",
      contact: { method: "telegram", value: "ales_wizard" },
    });

    expect(
      screen.getByRole("heading", { level: 2, name: t.title }),
    ).toBeInTheDocument();
    expect(screen.getByText("Олександр")).toBeInTheDocument();
  });

  it("opens a Telegram handle as a chat", async () => {
    await renderSection({
      name: "Олександр",
      contact: { method: "telegram", value: "ales_wizard" },
    });

    expect(screen.getByRole("link", { name: "@ales_wizard" })).toHaveAttribute(
      "href",
      "https://t.me/ales_wizard",
    );
  });

  it("dials a phone", async () => {
    await renderSection({
      name: "Олександр",
      contact: { method: "phone", value: "+380937861695" },
    });

    expect(screen.getByRole("link", { name: "+380937861695" })).toHaveAttribute(
      "href",
      "tel:+380937861695",
    );
  });

  it("says so when there is no contact, and skips a missing name", async () => {
    await renderSection({ name: null, contact: null });

    expect(
      screen.getByText(messages.parent.myVolunteer.noContact),
    ).toBeInTheDocument();
    expect(screen.queryByText(t.name)).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = await renderSection({
      name: "Олександр",
      contact: { method: "telegram", value: "ales_wizard" },
    });
    expect(await axe(container)).toHaveNoViolations();
  });
});
