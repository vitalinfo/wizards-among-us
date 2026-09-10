import { asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { faqs } from "@/db/schema";

// What the public landing page shows: active entries in display order.
export type PublicFaq = {
  id: string;
  title: string;
  description: string;
};

// Resilient by design, like getCampaignStates: the landing must render even if
// the database is unavailable, so a failure returns an empty list and the FAQ
// section renders nothing.
//
// There is deliberately NO hardcoded fallback copy. These answers are the
// page's factual claims — «Чи побачать волонтери адресу моєї дитини?» is the
// child-data exposure promise from CLAUDE.md — and a second copy in a message
// file would drift from what an admin edits, so a DB blip could re-promise a
// privacy tier we no longer honour. Showing nothing is the safe way to be wrong.
export async function listActiveFaqs(): Promise<PublicFaq[]> {
  try {
    return await getDb()
      .select({
        id: faqs.id,
        title: faqs.title,
        description: faqs.description,
      })
      .from(faqs)
      .where(eq(faqs.status, "active"))
      // created_at breaks a tie so the order is stable across requests even if
      // two rows share an ordinal.
      .orderBy(asc(faqs.ordinal), asc(faqs.createdAt));
  } catch (error) {
    console.error("listActiveFaqs failed:", error);
    return [];
  }
}
