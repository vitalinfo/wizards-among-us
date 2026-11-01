import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  notFound: () => {
    throw new Error("notFound");
  },
}));

import messages from "../../../../messages/uk.json";

import Maintenance from "../page";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("the maintenance page", () => {
  it("shows the maintenance copy while MAINTENANCE_MODE is on", async () => {
    vi.stubEnv("MAINTENANCE_MODE", "true");
    const ui = await Maintenance();
    const { container } = render(
      <NextIntlClientProvider locale="uk" messages={messages}>
        {ui}
      </NextIntlClientProvider>,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: messages.errors.maintenance.title,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(messages.errors.maintenance.body),
    ).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("is not a page when maintenance mode is off", async () => {
    vi.stubEnv("MAINTENANCE_MODE", "");
    await expect(Maintenance()).rejects.toThrow("notFound");
  });
});
