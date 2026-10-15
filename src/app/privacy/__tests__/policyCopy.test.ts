import { describe, expect, it } from "vitest";

import messages from "../../../../messages/uk.json";
import { POLICY_SECTIONS, POLICY_TAGS } from "../sections";

// The policy is a legal document transcribed verbatim from the project's own
// copy, and it is the one page on the site where a silent edit is a
// misstatement to a parent rather than a typo. These checks guard the SHAPE of
// that transcription — they cannot tell you the wording is right, only that
// nothing fell out of it and that every block still renders as a block.
const sections = messages.policy.sections as Record<
  string,
  { title: string; body: string }
>;

describe("the privacy policy copy", () => {
  // A renamed key drops a whole section and nothing else notices: next-intl
  // throws for a key that is asked for and missing, never for one that stopped
  // being asked for.
  it("renders every section the messages define, and no others", () => {
    expect([...POLICY_SECTIONS].sort()).toEqual(Object.keys(sections).sort());
  });

  it("numbers the headings 1 to 15 in the order they are rendered", () => {
    const numbers = POLICY_SECTIONS.map((key) =>
      Number(sections[key].title.match(/^(\d+)\./)?.[1]),
    );
    expect(numbers).toEqual(
      Array.from({ length: POLICY_SECTIONS.length }, (_, i) => i + 1),
    );
  });

  it.each([...POLICY_SECTIONS])("writes %s in blocks that close", (key) => {
    const body = sections[key].body;
    const stack: string[] = [];
    for (const [, close, tag] of body.matchAll(/<(\/?)([a-z0-9]+)>/g)) {
      if (close) {
        expect(stack.pop(), `</${tag}> in ${key}`).toBe(tag);
      } else {
        stack.push(tag);
      }
    }
    expect(stack, `unclosed tags in ${key}`).toEqual([]);
  });

  // A tag the renderer has no component for reaches the page as literal angle
  // brackets in the middle of a legal sentence.
  it.each([...POLICY_SECTIONS])("uses only known tags in %s", (key) => {
    const used = new Set(
      [...sections[key].body.matchAll(/<\/?([a-z0-9]+)>/g)].map((m) => m[1]),
    );
    expect([...used].filter((t) => !POLICY_TAGS.includes(t as never))).toEqual(
      [],
    );
  });

  // Every section opens with a block. Loose text outside one would be rendered
  // by next-intl as a bare string between the <p>s — visible, unstyled, and
  // outside the document's rhythm.
  it.each([...POLICY_SECTIONS])("wraps all of %s in blocks", (key) => {
    const outside = sections[key].body
      .replace(/<(p|h3|ul)>[\s\S]*?<\/\1>/g, "")
      .trim();
    expect(outside, `text outside a block in ${key}`).toBe("");
  });

  // Same trap as the About page's typed line breaks: <br></br> carries no
  // space, so a clause written hard against one runs into the next in the text
  // a screen reader reads and a reader copies.
  it.each([...POLICY_SECTIONS])(
    "leaves %s readable around its breaks",
    (key) => {
      // The break is removed, not turned into a space — replacing it WITH a
      // space is how a first draft of this check passed the very input it
      // exists to reject.
      const text = sections[key].body
        .replace(/<br><\/br>/g, "")
        .replace(/<\/?(p|h3|ul|li|b|mail)>/g, " ");
      expect(text.replace(/\s+/g, " ")).not.toMatch(/[.,:;!?]\p{Lu}/u);
    },
  );

  it("links the contact address wherever the document gives it", () => {
    const withMail = POLICY_SECTIONS.filter((key) =>
      sections[key].body.includes("<mail>"),
    );
    expect(withMail).toEqual(["general", "contact"]);
    for (const key of withMail) {
      expect(sections[key].body).toContain(
        "<mail>charivnyky.org@gmail.com</mail>",
      );
    }
  });
});
