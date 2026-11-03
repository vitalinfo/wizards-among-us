import {
  and,
  eq,
  exists,
  getTableColumns,
  isNull,
  notExists,
  sql,
  type SQL,
} from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import { applicationFiles, applications, campaigns } from "@/db/schema";

// A draft a parent started and never wrote anything into, in a campaign that is
// not active: it holds nothing anyone could lose. What `pnpm drafts:cleanup`
// removes.
//
// These columns are set when the draft is created (createDraft), so they say
// nothing about whether the parent wrote anything. EVERY other column has to be
// empty, including ones added after this was written: a new column counts as
// content until someone decides otherwise here — the safe direction for a
// condition that deletes.
export const BLANK_DRAFT_BOOKKEEPING = new Set<string>([
  "id",
  "campaignId",
  "parentId",
  "status",
  "createdAt",
  "updatedAt",
]);

// The draft form never saves a blank answer (blankToUndefined), so an untouched
// field is NULL. A whitespace-only text and an empty `{}` type_fields count as
// empty too, in case another path wrote them. Anything else — a consent
// answered «ні», `type_fields` holding an empty list — is something the parent
// did, and keeps the draft.
function isEmpty(column: PgColumn): SQL {
  switch (column.columnType) {
    case "PgText":
      return sql`nullif(btrim(${column}), '') is null`;
    case "PgJsonb":
      return sql`(${column} is null or ${column} = '{}'::jsonb)`;
    default:
      return isNull(column);
  }
}

// Status, campaign and files are all in the condition, not only in the caller,
// so deleteDraft repeats them under its row lock: a parent typing into the
// draft, or a campaign reactivated, between the dry run and the delete, keeps it.
export function blankDraftCondition(): SQL {
  const content = Object.entries(getTableColumns(applications))
    .filter(([key]) => !BLANK_DRAFT_BOOKKEEPING.has(key))
    .map(([, column]) => isEmpty(column));

  return and(
    eq(applications.status, "draft"),
    ...content,
    // exists() does not parenthesise a raw subquery, so the parentheses are
    // written out.
    notExists(
      sql`(select 1 from ${applicationFiles} where ${applicationFiles.applicationId} = ${applications.id})`,
    ),
    exists(
      sql`(select 1 from ${campaigns} where ${campaigns.id} = ${applications.campaignId} and ${campaigns.status} <> 'active')`,
    ),
  )!;
}
