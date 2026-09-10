import { asc, eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { faqs } from "@/db/schema";

import { moveInOrder, type MoveDirection } from "./ordering";
import type { FaqInput } from "./validation";

// Admin-side FAQ data access. Authorization happens in the server actions
// (requireAdmin); these functions execute, they don't adjudicate.

export type AdminFaq = typeof faqs.$inferSelect;

// The admin list shows INACTIVE rows too, in the same order the landing page
// would use — an admin reorders the full list, not just the visible part.
export async function listFaqs(): Promise<AdminFaq[]> {
  return getDb()
    .select()
    .from(faqs)
    .orderBy(asc(faqs.ordinal), asc(faqs.createdAt));
}

export async function getAdminFaq(id: string): Promise<AdminFaq | null> {
  const [row] = await getDb()
    .select()
    .from(faqs)
    .where(eq(faqs.id, id))
    .limit(1);
  return row ?? null;
}

// A new entry goes to the END of the list. The position is computed in SQL from
// the current maximum, so it stays correct without reading the list first;
// coalesce covers the empty table. Two simultaneous inserts can still read the
// same max and land on the same ordinal — harmless, because ordinal is not
// unique and the tie resolves by created_at until the next reorder renumbers.
export async function createFaq(values: FaqInput): Promise<string> {
  const db = getDb();
  const [row] = await db
    .insert(faqs)
    .values({
      ...values,
      ordinal: sql`(select coalesce(max(${faqs.ordinal}), -1) + 1 from ${faqs})`,
    })
    .returning({ id: faqs.id });
  return row.id;
}

export async function updateFaq(id: string, values: FaqInput): Promise<void> {
  await getDb().update(faqs).set(values).where(eq(faqs.id, id));
}

export async function deleteFaq(id: string): Promise<void> {
  await getDb().delete(faqs).where(eq(faqs.id, id));
}

// Reordering. Reads the current order, moves the one row, then rewrites EVERY
// ordinal as 0..n-1 in the same transaction.
//
// Rewriting the whole list rather than swapping two rows is the boring choice
// on purpose: a swap is a no-op when the two rows happen to share an ordinal,
// so the admin would click «вгору» and see nothing move. Renumbering always
// produces a gap-free, collision-free sequence, and the list is a handful of
// rows — this is ten UPDATEs, not a scaling concern.
//
// Returns whether anything changed, so a move off either end costs no writes.
export async function moveFaq(
  id: string,
  direction: MoveDirection,
): Promise<boolean> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: faqs.id })
      .from(faqs)
      .orderBy(asc(faqs.ordinal), asc(faqs.createdAt));

    const current = rows.map((row) => row.id);
    const next = moveInOrder(current, id, direction);
    if (next.every((value, index) => value === current[index])) {
      return false;
    }

    for (const [index, faqId] of next.entries()) {
      await tx.update(faqs).set({ ordinal: index }).where(eq(faqs.id, faqId));
    }
    return true;
  });
}
