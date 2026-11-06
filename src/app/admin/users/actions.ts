"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordAuditLog } from "@/features/audit/log";
import type { UserRole } from "@/db/enums";
import { setUserNote, setUserRoles } from "@/features/users/adminQueries";
import {
  MAX_USER_NOTE_LENGTH,
  type UserNoteState,
} from "@/features/users/noteState";
import type { UserRolesState } from "@/features/users/roleState";
import { requireAdmin } from "@/lib/auth/session";
import { userRoleSchema } from "@/lib/enumSchemas";

// requireAdmin() first — a server action is a public endpoint, so hiding the UI
// proves nothing. It throws rather than returning, so a non-admin can't fall
// through to the write.
export async function saveUserNoteAction(
  userId: string,
  // Where to go once it saves — the list view the admin came from, search and
  // page intact. Bound by the page, never read from the form: a redirect target
  // taken from user input is an open redirect.
  returnTo: string,
  _prev: UserNoteState,
  formData: FormData,
): Promise<UserNoteState> {
  const admin = await requireAdmin();

  const raw = String(formData.get("note") ?? "").trim();
  if (raw.length > MAX_USER_NOTE_LENGTH) {
    return { status: "too_long" };
  }
  // An emptied note clears the column rather than storing "" — "no note" is a
  // real state the application banner reads.
  const note = raw === "" ? null : raw;

  if (!(await setUserNote(userId, note))) {
    return { status: "not_found" };
  }

  // The note itself is NOT logged. It is an admin's words about a family, and
  // copying it into audit_logs would make that table a second store of the same
  // sensitive text with a different retention story — the same reason the admin
  // application edit logs field NAMES and never values.
  await recordAuditLog({
    actor: admin,
    action: note === null ? "user.note_cleared" : "user.note_saved",
    targetType: "user",
    targetId: userId,
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  // The banner at the top of every application this parent filed.
  revalidatePath("/admin/applications", "layout");

  // Back to the list, as the admin application edit does. Staying on the form
  // after a save is the "did that work?" state we removed from the parent flow;
  // it also makes this POST → redirect → GET, so a reload cannot re-submit.
  redirect(returnTo);
}

// Grant or revoke a person's roles by hand. The form posts every role it
// should end up with — a locked role, whose checkbox is disabled, rides along
// in a hidden field — so a missing value always means "revoke", and the query
// refuses a revoke that is no longer allowed.
export async function saveUserRolesAction(
  userId: string,
  returnTo: string,
  _prev: UserRolesState,
  formData: FormData,
): Promise<UserRolesState> {
  const admin = await requireAdmin();

  const wanted = new Set<UserRole>();
  for (const value of formData.getAll("role")) {
    const parsed = userRoleSchema.safeParse(value);
    if (parsed.success) {
      wanted.add(parsed.data);
    }
  }

  const result = await setUserRoles(userId, [...wanted]);
  if (result.status !== "saved") {
    return result;
  }

  // One event per role, named for the role: "who made this person a
  // volunteer" is the question the trail has to answer before a child is
  // assigned to them.
  for (const role of result.granted) {
    await recordAuditLog({
      actor: admin,
      action: `user.${role}_granted`,
      targetType: "user",
      targetId: userId,
    });
  }
  for (const role of result.revoked) {
    await recordAuditLog({
      actor: admin,
      action: `user.${role}_revoked`,
      targetType: "user",
      targetId: userId,
    });
  }

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);

  redirect(returnTo);
}
