import { getTableColumns } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

import { applications } from "@/db/schema";

import { BLANK_DRAFT_BOOKKEEPING, blankDraftCondition } from "../blankDrafts";

const rendered = new PgDialect().sqlToQuery(blankDraftCondition()).sql;
const columns = Object.entries(getTableColumns(applications));

describe("blankDraftCondition", () => {
  // The condition deletes, so the failure that matters is a column it forgot:
  // a draft holding only that answer would be removed as blank.
  it("requires every column but the bookkeeping ones to be empty", () => {
    const content = columns.filter(
      ([key]) => !BLANK_DRAFT_BOOKKEEPING.has(key),
    );
    expect(content.length).toBeGreaterThan(0);
    for (const [, column] of content) {
      expect(rendered).toContain(`"applications"."${column.name}"`);
    }
  });

  it("does not treat the columns every draft has as content", () => {
    for (const key of ["parentId", "createdAt", "updatedAt"]) {
      const [, column] = columns.find(([name]) => name === key)!;
      expect(rendered).not.toContain(`"applications"."${column.name}"`);
    }
  });

  // btrim() exists only for text; on numeric/integer/boolean Postgres
  // rejects the whole statement.
  it("trims only text columns", () => {
    expect(rendered).toContain(`btrim("applications"."child_name")`);
    expect(rendered).toContain(`"applications"."gift_price" is null`);
    expect(rendered).not.toContain(`btrim("applications"."gift_price")`);
  });

  it("keeps drafts with files, and drafts in the active campaign", () => {
    expect(rendered).toContain(`not exists (select 1 from "application_files"`);
    expect(rendered).toContain(`exists (select 1 from "campaigns"`);
    expect(rendered).toContain(`"campaigns"."status" <> 'active')`);
  });
});
