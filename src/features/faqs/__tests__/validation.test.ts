import { describe, expect, it } from "vitest";

import { faqInputSchema } from "../validation";

const valid = {
  title: "Хто може подати заявку?",
  description: "Родини з дітьми, які через війну виїхали з дому.",
  status: "active",
};

describe("faqInputSchema", () => {
  it("accepts a complete entry", () => {
    expect(faqInputSchema.safeParse(valid).success).toBe(true);
  });

  // Both columns are notNull for the same reason: half an entry renders as a
  // broken accordion row on the public page.
  it("rejects a question with no answer, and an answer with no question", () => {
    expect(
      faqInputSchema.safeParse({ ...valid, description: "" }).success,
    ).toBe(false);
    expect(faqInputSchema.safeParse({ ...valid, title: "" }).success).toBe(
      false,
    );
  });

  // Whitespace-only would pass a `min(1)` applied before trimming.
  it("rejects whitespace-only text", () => {
    expect(
      faqInputSchema.safeParse({ ...valid, title: "   \n  " }).success,
    ).toBe(false);
  });

  it("trims what it stores", () => {
    const parsed = faqInputSchema.parse({
      ...valid,
      title: "  Питання?  ",
      description: "  Відповідь.  ",
    });
    expect(parsed).toEqual({
      title: "Питання?",
      description: "Відповідь.",
      status: "active",
    });
  });

  it("only accepts the two real statuses", () => {
    expect(
      faqInputSchema.safeParse({ ...valid, status: "inactive" }).success,
    ).toBe(true);
    for (const status of ["draft", "published", "", undefined]) {
      expect(faqInputSchema.safeParse({ ...valid, status }).success).toBe(
        false,
      );
    }
  });

  // The position is owned by the move actions, which renumber the whole list.
  // A caller posting one must not be able to set it.
  it("ignores an ordinal submitted with the form", () => {
    const parsed = faqInputSchema.parse({ ...valid, ordinal: 99 });
    expect(parsed).not.toHaveProperty("ordinal");
  });
});
