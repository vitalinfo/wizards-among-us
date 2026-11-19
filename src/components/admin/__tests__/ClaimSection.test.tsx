import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);
// Who holds the child is a database read; what is under test is which controls
// the section offers for it.
vi.mock("@/features/claims/queries", () => ({
  getClaimHolder: async () => ({
    claimedAt: new Date("2026-11-01T10:00:00Z"),
    volunteerId: "v1",
    username: "vira",
    firstName: "Віра",
    phone: null,
  }),
  searchVolunteers: async () => [],
}));

import messages from "../../../../messages/uk.json";

import { ClaimSection } from "../ClaimSection";

const t = messages.admin.applications.claim;

async function renderSection(status: string) {
  const ui = await ClaimSection({
    applicationId: "0f1e2d3c-4b5a-4968-8776-655443322110",
    status,
    search: null,
    assignError: null,
  });
  return render(<>{ui}</>);
}

describe("ClaimSection", () => {
  it.each(["claimed", "processed"])(
    "offers to release a %s child",
    async (status) => {
      const { container } = await renderSection(status);
      expect(screen.getByRole("link", { name: t.releaseCta })).toHaveAttribute(
        "href",
        expect.stringContaining("release=1"),
      );
      expect(await axe(container)).toHaveNoViolations();
    },
  );

  // The family has confirmed the gift; the claim is the record of who helped.
  it("does not offer to release a fulfilled child", async () => {
    const { container } = await renderSection("fulfilled");
    expect(
      screen.getByText(t.heldBy.replace("{who}", "@vira")),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: t.releaseCta }),
    ).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
