import { NextIntlClientProvider } from "next-intl";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../../../../messages/uk.json";
import type { UserRole } from "@/db/enums";
import { locale } from "@/i18n/config";
import { axe } from "@/test/axe";

const result = vi.hoisted(() => ({
  current: { status: "idle" } as { status: string; role?: string },
}));
const saved = vi.hoisted(() => ({ calls: [] as FormData[] }));

vi.mock("@/app/admin/users/actions", () => ({
  saveUserRolesAction: vi.fn(
    async (
      _userId: string,
      _returnTo: string,
      _prev: unknown,
      formData: FormData,
    ) => {
      saved.calls.push(formData);
      return result.current;
    },
  ),
}));

import { UserRolesForm } from "../UserRolesForm";

const t = messages.admin.users.roleForm;
const tRoles = messages.admin.users.roles;

function wrap({
  roles = [],
  applicationCount = 0,
  claimCount = 0,
}: {
  roles?: UserRole[];
  applicationCount?: number;
  claimCount?: number;
}) {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <UserRolesForm
        userId="u1"
        roles={roles}
        applicationCount={applicationCount}
        claimCount={claimCount}
        returnTo="/admin/users"
      />
    </NextIntlClientProvider>,
  );
}

const parentBox = () => screen.getByRole("checkbox", { name: tRoles.parent });
const volunteerBox = () =>
  screen.getByRole("checkbox", { name: tRoles.volunteer });

async function save() {
  await userEvent.setup().click(screen.getByRole("button", { name: t.save }));
  await waitFor(() => expect(saved.calls).toHaveLength(1));
  return saved.calls[0].getAll("role");
}

beforeEach(() => {
  saved.calls = [];
  result.current = { status: "idle" };
});

describe("UserRolesForm", () => {
  it("shows the roles the person holds", () => {
    wrap({ roles: ["volunteer"] });

    expect(parentBox()).not.toBeChecked();
    expect(volunteerBox()).toBeChecked();
  });

  // The gap this exists for: someone who signed in and did nothing has no
  // role, so the manual assignment search can't find them.
  it("grants a role to someone who has none", async () => {
    wrap({ roles: [] });

    await userEvent.setup().click(volunteerBox());

    expect(await save()).toEqual(["volunteer"]);
  });

  it("revokes a role that is not in use", async () => {
    wrap({ roles: ["parent", "volunteer"] });

    await userEvent.setup().click(parentBox());

    expect(await save()).toEqual(["volunteer"]);
  });

  it("locks parent while the person has applications, and says why", async () => {
    wrap({ roles: ["parent"], applicationCount: 2 });

    expect(parentBox()).toBeDisabled();
    expect(parentBox()).toHaveAccessibleDescription(t.lockedParent);
    // A disabled checkbox isn't submitted; the role must still arrive, or the
    // server would read its absence as a revoke.
    expect(await save()).toEqual(["parent"]);
  });

  it("locks volunteer while the person holds a claim", () => {
    wrap({ roles: ["volunteer"], claimCount: 1 });

    expect(volunteerBox()).toBeDisabled();
    expect(volunteerBox()).toHaveAccessibleDescription(t.lockedVolunteer);
  });

  // A draft counts as an application but does not make anyone a parent — the
  // lock is on taking a role away, never on giving one.
  it("still lets an admin grant parent to someone with only a draft", async () => {
    wrap({ roles: [], applicationCount: 1 });

    expect(parentBox()).toBeEnabled();
    await userEvent.setup().click(parentBox());

    expect(await save()).toEqual(["parent"]);
  });

  // On success the action redirects, so this form only renders failures.
  it("announces a revoke the server refused", async () => {
    result.current = { status: "locked", role: "volunteer" };
    wrap({ roles: ["volunteer"] });

    await userEvent.setup().click(volunteerBox());
    await save();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      t.lockedError.replace("{role}", tRoles.volunteer),
    );
  });

  it("has no accessibility violations", async () => {
    const { container } = wrap({ roles: ["parent"], applicationCount: 1 });
    expect(await axe(container)).toHaveNoViolations();
  });
});
