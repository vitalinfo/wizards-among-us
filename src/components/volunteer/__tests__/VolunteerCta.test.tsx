import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

// The opt-in path is a server action; the component only has to point at it.
vi.mock("@/app/volunteer/actions", () => ({
  becomeVolunteerAction: vi.fn(),
}));

import messages from "../../../../messages/uk.json";
import { axe } from "@/test/axe";
import type { AdminActor, UserActor } from "@/lib/actor";
import type { UserRole } from "@/db/enums";

const { VolunteerCta, volunteerCtaState } = await import("../VolunteerCta");

function wrap(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="uk" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const BECOME = messages.initiatives.volunteer;

const user = (roles: readonly UserRole[]): UserActor => ({
  kind: "user",
  id: "u1",
  username: "olena",
  firstName: "Олена",
  roles,
});

describe("volunteerCtaState", () => {
  it("reads anonymous, candidate and volunteer off the actor", () => {
    expect(volunteerCtaState(null)).toBe("anonymous");
    expect(volunteerCtaState(user([]))).toBe("candidate");
    expect(volunteerCtaState(user(["volunteer"]))).toBe("volunteer");
  });

  // An admin is NOT a user (three actor states — see lib/actor), so the page
  // must not offer them a volunteer path they cannot take.
  it("treats an admin as anonymous", () => {
    const admin: AdminActor = {
      kind: "admin",
      id: "a1",
      email: "admin@example.com",
    };
    expect(volunteerCtaState(admin)).toBe("anonymous");
  });
});

describe("VolunteerCta", () => {
  // The whole reason this component exists: before it, the page had a button
  // that went nowhere. Assert the destination, not the presence.
  it("sends a signed-out visitor to sign in, and comes back here", () => {
    wrap(<VolunteerCta state="anonymous" />);
    expect(screen.getByRole("link", { name: BECOME })).toHaveAttribute(
      "href",
      "/login?next=%2Fvolunteer",
    );
  });

  // The role is self-serve (Phase 6): nothing else grants it, and browsing
  // requires it. So this state posts rather than navigates.
  it("offers a signed-in visitor the opt-in, landing on the children list", () => {
    const { container } = wrap(<VolunteerCta state="candidate" />);
    expect(screen.getByRole("button", { name: BECOME })).toHaveAttribute(
      "type",
      "submit",
    );
    expect(container.querySelector('input[name="next"]')).toHaveAttribute(
      "value",
      "/volunteer/children",
    );
  });

  it("sends an existing volunteer straight to the children", () => {
    wrap(<VolunteerCta state="volunteer" />);
    expect(screen.getByRole("link", { name: BECOME })).toHaveAttribute(
      "href",
      "/volunteer/children",
    );
  });

  // One label in every state (Vital) — only the destination moves. A second
  // wording here would mean the page promises one thing to a visitor and
  // another to the same person once they have signed in.
  it("says «Хочу стати Чарівником» whoever is reading", () => {
    for (const state of ["anonymous", "candidate", "volunteer"] as const) {
      const { unmount } = wrap(<VolunteerCta state={state} />);
      expect(
        screen.getByRole(state === "candidate" ? "button" : "link", {
          name: BECOME,
        }),
      ).toBeInTheDocument();
      unmount();
    }
  });

  it("leaves no dead controls in any state", () => {
    for (const state of ["anonymous", "volunteer"] as const) {
      const { unmount } = wrap(<VolunteerCta state={state} />);
      expect(screen.queryAllByRole("button")).toHaveLength(0);
      unmount();
    }
  });

  it("has no accessibility violations", async () => {
    for (const state of ["anonymous", "candidate", "volunteer"] as const) {
      const { container, unmount } = wrap(<VolunteerCta state={state} />);
      expect(await axe(container)).toHaveNoViolations();
      unmount();
    }
  });
});
