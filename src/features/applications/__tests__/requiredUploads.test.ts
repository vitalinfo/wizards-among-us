import { describe, expect, it } from "vitest";

import { missingUploads, REQUIRED_UPLOADS } from "../files";

// The form marks these required, but a `required` attribute is a browser hint
// on a styled label — it cannot block a submit, and a server action is a public
// endpoint. Before this, an application could arrive with no ВПО certificate
// and no photo of the letter, which is most of what an admin reviews.
describe("required uploads", () => {
  it("St Nicholas needs the certificate and both photos", () => {
    expect(missingUploads("saint_nicholas_day", [])).toEqual([
      "idp_certificate",
      "letter_photo",
      "child_with_letter_photo",
    ]);
  });

  it("reports only what is still missing, in the order the form asks", () => {
    expect(missingUploads("saint_nicholas_day", ["letter_photo"])).toEqual([
      "idp_certificate",
      "child_with_letter_photo",
    ]);
  });

  it("is satisfied once all three are present", () => {
    expect(
      missingUploads("saint_nicholas_day", [
        "child_with_letter_photo",
        "idp_certificate",
        "letter_photo",
      ]),
    ).toEqual([]);
  });

  // A confirmation photo is uploaded much later and must not count towards
  // the submit requirement.
  it("ignores uploads that are not required", () => {
    expect(missingUploads("saint_nicholas_day", ["confirmation"])).toHaveLength(
      3,
    );
  });

  // Requirements are per campaign type, like the type_fields schemas.
  it("is defined for every campaign type", () => {
    for (const kinds of Object.values(REQUIRED_UPLOADS)) {
      expect(Array.isArray(kinds)).toBe(true);
    }
  });
});
