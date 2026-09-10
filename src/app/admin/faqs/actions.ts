"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordAuditLog } from "@/features/audit/log";
import {
  createFaq,
  deleteFaq,
  getAdminFaq,
  moveFaq,
  updateFaq,
} from "@/features/faqs/adminQueries";
import type { FaqActionState } from "@/features/faqs/formState";
import type { MoveDirection } from "@/features/faqs/ordering";
import { faqInputSchema } from "@/features/faqs/validation";
import { requireAdmin } from "@/lib/auth/session";

// FAQ administration. EVERY action calls requireAdmin() first — a server action
// is a public endpoint, so hiding the UI proves nothing. requireAdmin throws
// rather than returning, so a non-admin can't fall through to the work.
//
// Each action revalidates "/" as well as the admin list: the FAQ is rendered on
// the public landing page, which is force-dynamic but cached at the route level.
//
// Audit-logged because these answers are the page's factual claims about what a
// volunteer can see and whether we take money. "Who changed the privacy answer,
// and when" is exactly the question the trail exists for.

function parse(formData: FormData) {
  return faqInputSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    status: formData.get("status"),
  });
}

export async function createFaqAction(
  _prev: FaqActionState,
  formData: FormData,
): Promise<FaqActionState> {
  const admin = await requireAdmin();

  const parsed = parse(formData);
  if (!parsed.success) {
    return { status: "invalid" };
  }

  const id = await createFaq(parsed.data);
  await recordAuditLog({
    actor: admin,
    action: "faq.created",
    targetType: "faq",
    targetId: id,
  });
  revalidatePath("/admin/faqs");
  revalidatePath("/");
  // redirect() throws, so nothing after it runs — the return type is satisfied
  // by the throw, not by reaching a return.
  redirect("/admin/faqs");
}

export async function updateFaqAction(
  id: string,
  _prev: FaqActionState,
  formData: FormData,
): Promise<FaqActionState> {
  const admin = await requireAdmin();

  const existing = await getAdminFaq(id);
  if (!existing) {
    return { status: "not_found" };
  }

  const parsed = parse(formData);
  if (!parsed.success) {
    return { status: "invalid" };
  }

  await updateFaq(id, parsed.data);
  await recordAuditLog({
    actor: admin,
    action: "faq.updated",
    targetType: "faq",
    targetId: id,
  });
  revalidatePath("/admin/faqs");
  revalidatePath("/");
  redirect("/admin/faqs");
}

// Hard delete, behind a confirmation. This is editorial copy, not a record
// about a person, so there is nothing to retain — and `inactive` already covers
// "take it down but keep it". The audit row survives the row it describes.
export async function deleteFaqAction(id: string): Promise<void> {
  const admin = await requireAdmin();
  await deleteFaq(id);
  await recordAuditLog({
    actor: admin,
    action: "faq.deleted",
    targetType: "faq",
    targetId: id,
  });
  revalidatePath("/admin/faqs");
  revalidatePath("/");
  redirect("/admin/faqs");
}

// Reordering is not audited: it changes the order of published answers, not
// what any of them says, and a log entry per click would bury the edits that
// matter underneath them.
export async function moveFaqAction(
  id: string,
  direction: MoveDirection,
): Promise<void> {
  await requireAdmin();
  await moveFaq(id, direction);
  revalidatePath("/admin/faqs");
  revalidatePath("/");
  redirect("/admin/faqs");
}
