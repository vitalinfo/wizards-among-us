import { and, asc, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { applications, claims, users } from "@/db/schema";
import { resolveUserContact } from "@/features/users/contact";

import { toCsv } from "./csv";

// One export per campaign: the full working list a coordinator runs a campaign
// from (Vital). It carries the fields the child-data invariant calls
// sensitive — parent name, current town, delivery information, family story and
// the family's contact — so the file itself is the most dangerous artifact this
// system produces. Every download is audit-logged.
//
// It still exports NO files. The ВПО certificate stays behind the authorized
// route that logs each read: a state document about a child does not belong in
// a spreadsheet that gets emailed around.
const HEADERS = [
  "id",
  "child_name",
  "child_age",
  "current_region",
  "gift_description",
  "gift_price_uah",
  "status",
  "submitted_at",
  "claimed",
  "parent_name",
  "current_town",
  "home_town",
  "home_region",
  "displaced_year",
  "family_story",
  "delivery_information",
  "contact",
  "gift_urls",
  "social_media_consent",
] as const;

// One campaign at a time. An export that silently spanned every campaign would
// resurrect years of archived families into a single file.
export async function exportApplicationsCsv(
  campaignId: string,
): Promise<string> {
  const rows = await getDb()
    .select({
      application: applications,
      username: users.username,
      phone: users.phone,
      // Left-joined on the ACTIVE claim only, so a released claim reads as
      // unclaimed — which is what a coordinator needs to act on.
      claimId: claims.id,
    })
    .from(applications)
    .innerJoin(users, eq(users.id, applications.parentId))
    .leftJoin(
      claims,
      and(eq(claims.applicationId, applications.id), isNull(claims.releasedAt)),
    )
    .where(eq(applications.campaignId, campaignId))
    .orderBy(asc(applications.submittedAt));

  const body = rows.map((row) => {
    const a = row.application;
    const contact = resolveUserContact(row);
    const giftUrls = (a.typeFields as { giftUrls?: unknown } | null)?.giftUrls;
    return [
      a.id,
      a.childName,
      a.childAge,
      a.currentRegion,
      a.giftDescription,
      a.giftPrice,
      a.status,
      a.submittedAt,
      row.claimId ? "yes" : "no",
      a.parentName,
      a.currentTown,
      a.homeTown,
      a.homeRegion,
      a.displacedYear,
      a.familyStory,
      a.deliveryInformation,
      contact === null
        ? ""
        : contact.method === "telegram"
          ? `@${contact.value}`
          : contact.value,
      Array.isArray(giftUrls) ? giftUrls.join(" ") : "",
      a.socialMediaConsent === null ? "" : a.socialMediaConsent ? "yes" : "no",
    ];
  });

  return toCsv(HEADERS, body);
}
