import { and, asc, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { applications, claims, users } from "@/db/schema";
import { resolveUserContact } from "@/features/users/contact";

import { toCsv } from "./csv";

// Two deliberately different exports.
//
// COORDINATION answers the day-to-day questions — how many children are still
// unclaimed, what does the campaign cost, which wishes are outstanding — and
// carries nothing that identifies a family. It is the default because it is the
// one people actually need, and the dangerous variant should not be the one
// that falls to hand.
//
// FULL adds the fields the child-data invariant calls sensitive: parent name,
// current town, delivery details, the family's contact. It is a separate,
// explicit action and is audit-logged as its own event.
//
// NEITHER exports a file, and the ВПО certificate in particular is reachable
// only through the authorized route that logs each read. A copy of a state
// document about a child does not belong in a spreadsheet that gets emailed.
export const EXPORT_SCOPES = ["coordination", "full"] as const;
export type ExportScope = (typeof EXPORT_SCOPES)[number];

export function isExportScope(value: unknown): value is ExportScope {
  return EXPORT_SCOPES.includes(value as ExportScope);
}

const COORDINATION_HEADERS = [
  "id",
  "child_name",
  "child_age",
  "current_region",
  "gift_description",
  "gift_price_uah",
  "status",
  "submitted_at",
  "claimed",
] as const;

const FULL_EXTRA_HEADERS = [
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

export function headersFor(scope: ExportScope): readonly string[] {
  return scope === "full"
    ? [...COORDINATION_HEADERS, ...FULL_EXTRA_HEADERS]
    : COORDINATION_HEADERS;
}

// One campaign at a time. An export that silently spanned every campaign would
// resurrect years of archived families into a single file.
export async function exportApplicationsCsv(
  campaignId: string,
  scope: ExportScope,
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
    const base = [
      a.id,
      a.childName,
      a.childAge,
      a.currentRegion,
      a.giftDescription,
      a.giftPrice,
      a.status,
      a.submittedAt,
      row.claimId ? "yes" : "no",
    ];
    if (scope !== "full") {
      return base;
    }

    const contact = resolveUserContact(row);
    const giftUrls = (a.typeFields as { giftUrls?: unknown } | null)?.giftUrls;
    return [
      ...base,
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

  return toCsv(headersFor(scope), body);
}
