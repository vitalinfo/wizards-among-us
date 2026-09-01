import { describe, expect, it } from "vitest";
import { z } from "zod";

import { issueCode } from "../formState";
import {
  applicationDraftFormSchema,
  applicationSubmitSchemaForCampaign,
} from "../validation";

function codesFor(result: z.SafeParseReturnType<unknown, unknown>) {
  if (result.success) {
    return {};
  }
  return Object.fromEntries(
    result.error.issues.map((issue) => [
      String(issue.path[0] ?? ""),
      issueCode(issue),
    ]),
  );
}

const validSubmit = {
  parentName: "Ivan",
  childName: "Olha",
  childAge: 8,
  homeTown: "Bakhmut",
  homeRegion: "donetsk",
  currentTown: "Lviv",
  currentRegion: "lviv",
  displacedYear: 2022,
  familyStory: "Our family relocated in 2022.",
  giftDescription: "A school backpack",
  giftPrice: 1200,
  deliveryInformation: "Nova Poshta #5, Lviv",
  consent: true,
  socialMediaConsent: false,
} as const;

// The client translates these codes into Ukrainian, so a code that doesn't
// distinguish two failures becomes a message that doesn't either.
describe("issueCode", () => {
  it("tells a malformed link apart from any other bad string", () => {
    const codes = codesFor(
      applicationDraftFormSchema.safeParse({
        giftDescription: "Лялька",
        giftUrls: "not-a-url",
        giftPrice: "700",
      }),
    );

    // Both are `invalid_string` to zod; only the refined code can say which.
    expect(codes.giftUrls).toBe("invalid_url");
  });

  it("passes a custom refinement's own code through", () => {
    const codes = codesFor(
      applicationSubmitSchemaForCampaign({ giftPriceCap: "500" }).safeParse({
        ...validSubmit,
        giftPrice: 900,
      }),
    );

    expect(codes.giftPrice).toBe("gift_price_over_cap");
  });

  it("leaves an ordinary code alone", () => {
    const codes = codesFor(z.object({ a: z.string() }).safeParse({ a: 1 }));

    expect(codes.a).toBe("invalid_type");
  });
});
