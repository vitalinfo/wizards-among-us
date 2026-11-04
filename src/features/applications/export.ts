import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import type { UkraineRegion } from "@/db/enums";
import { applicationFiles, applications, claims, users } from "@/db/schema";
import {
  resolveUserContact,
  type ResolvedContact,
} from "@/features/users/contact";

import {
  moderationConditions,
  moderationOrder,
  type ModerationFilterInput,
} from "./adminQueries";
import { toCsv } from "./csv";
import { latestByKind } from "./files";

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
  "child_gender",
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
    return [
      a.id,
      a.childName,
      a.childAge,
      a.childGender,
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
      contactCell(contact),
      giftUrlsOf(a.typeFields).join(" "),
      a.socialMediaConsent === null ? "" : a.socialMediaConsent ? "yes" : "no",
    ];
  });

  return toCsv(HEADERS, body);
}

function contactCell(contact: ResolvedContact | null): string {
  if (contact === null) {
    return "";
  }
  return contact.method === "telegram" ? `@${contact.value}` : contact.value;
}

// A link rather than «@handle»: it opens the chat from the spreadsheet, and a
// cell starting with @ would be read as a formula and written with the guard's
// apostrophe in front. A phone keeps that apostrophe — without it a
// spreadsheet reads «+380…» as a number and drops the plus.
function queueContactCell(contact: ResolvedContact | null): string {
  if (contact?.method === "telegram") {
    return `https://t.me/${contact.value}`;
  }
  return contactCell(contact);
}

function giftUrlsOf(typeFields: unknown): string[] {
  const urls = (typeFields as { giftUrls?: unknown } | null)?.giftUrls;
  return Array.isArray(urls) ? urls.map(String) : [];
}

// ─── The queue's export ──────────────────────────────────────────────────────
//
// What /admin/applications shows, under its current filter, as the working
// list a coordinator hands volunteers from: who the child is, where the family
// came from and lives now, what they wished for, and where to send it. The
// columns are the ones the coordinators asked for, in their order, under
// Ukrainian headings (admin.applications.export.columns).
//
// Same rules as the campaign export: one campaign at a time (the route refuses
// «Усі кампанії»), audit-logged, and no files inside it. The photos go in as
// LINKS to the authorized file route, so opening one still needs an admin's
// session and still writes `application.file_viewed` — a forwarded file shows
// a stranger nothing.

export const QUEUE_EXPORT_COLUMNS = [
  "childName",
  "childAge",
  "homeTown",
  "homeRegion",
  "currentTown",
  "currentRegion",
  "familyStory",
  "giftDescription",
  "giftUrls",
  "letterPhoto",
  "childWithLetterPhoto",
  "deliveryInformation",
  "contact",
] as const;

export type QueueExportColumn = (typeof QUEUE_EXPORT_COLUMNS)[number];

// The two photos, in column order. Never the ВПО certificate: it is a state
// document about a child, and even a link to it does not belong in a file that
// gets passed around.
const QUEUE_EXPORT_PHOTO_KINDS = [
  "letter_photo",
  "child_with_letter_photo",
] as const;

export type QueueExportRow = {
  application: Pick<
    typeof applications.$inferSelect,
    | "id"
    | "childName"
    | "childAge"
    | "homeTown"
    | "homeRegion"
    | "currentTown"
    | "currentRegion"
    | "familyStory"
    | "giftDescription"
    | "typeFields"
    | "deliveryInformation"
  >;
  username: string | null;
  phone: string | null;
  // Oldest first, as the files are listed everywhere else — so the newest of a
  // kind is the last one (latestByKind).
  photos: readonly { id: string; kind: string }[];
};

export async function listForQueueExport(
  filter: ModerationFilterInput,
): Promise<QueueExportRow[]> {
  const conditions = moderationConditions(filter);
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await getDb()
    .select({
      application: {
        id: applications.id,
        childName: applications.childName,
        childAge: applications.childAge,
        homeTown: applications.homeTown,
        homeRegion: applications.homeRegion,
        currentTown: applications.currentTown,
        currentRegion: applications.currentRegion,
        familyStory: applications.familyStory,
        giftDescription: applications.giftDescription,
        typeFields: applications.typeFields,
        deliveryInformation: applications.deliveryInformation,
      },
      username: users.username,
      phone: users.phone,
    })
    .from(applications)
    .innerJoin(users, eq(users.id, applications.parentId))
    .where(where)
    .orderBy(...moderationOrder());

  if (rows.length === 0) {
    return [];
  }

  // One query for every row's photos, scoped by the same filter rather than by
  // a list of ids — a campaign's worth of ids would be a parameter per row.
  const files = await getDb()
    .select({
      id: applicationFiles.id,
      applicationId: applicationFiles.applicationId,
      kind: applicationFiles.kind,
    })
    .from(applicationFiles)
    .where(
      and(
        inArray(applicationFiles.kind, QUEUE_EXPORT_PHOTO_KINDS),
        inArray(
          applicationFiles.applicationId,
          getDb()
            .select({ id: applications.id })
            .from(applications)
            .where(where),
        ),
      ),
    )
    .orderBy(asc(applicationFiles.createdAt), asc(applicationFiles.id));

  const byApplication = new Map<string, typeof files>();
  for (const file of files) {
    const list = byApplication.get(file.applicationId) ?? [];
    list.push(file);
    byApplication.set(file.applicationId, list);
  }
  return rows.map((row) => ({
    ...row,
    photos: byApplication.get(row.application.id) ?? [],
  }));
}

export function queueExportCsv(
  rows: readonly QueueExportRow[],
  deps: {
    heading: (column: QueueExportColumn) => string;
    regionLabel: (region: UkraineRegion) => string;
    // An absolute url: the file is opened outside the app.
    photoUrl: (applicationId: string, fileId: string) => string;
  },
): string {
  const body = rows.map((row) => {
    const a = row.application;
    const [letter, childWithLetter] = QUEUE_EXPORT_PHOTO_KINDS.map(
      (kind) => latestByKind(row.photos, [kind])[0],
    );
    const values: Record<QueueExportColumn, unknown> = {
      childName: a.childName,
      childAge: a.childAge,
      homeTown: a.homeTown,
      homeRegion: a.homeRegion ? deps.regionLabel(a.homeRegion) : null,
      currentTown: a.currentTown,
      currentRegion: a.currentRegion ? deps.regionLabel(a.currentRegion) : null,
      familyStory: a.familyStory,
      giftDescription: a.giftDescription,
      // One per line: a cell holds them all, and a spreadsheet shows each on
      // its own line rather than one run-on string.
      giftUrls: giftUrlsOf(a.typeFields).join("\n"),
      letterPhoto: letter ? deps.photoUrl(a.id, letter.id) : null,
      childWithLetterPhoto: childWithLetter
        ? deps.photoUrl(a.id, childWithLetter.id)
        : null,
      deliveryInformation: a.deliveryInformation,
      contact: queueContactCell(resolveUserContact(row)),
    };
    // Built from the column list, so a value cannot land under another
    // column's heading.
    return QUEUE_EXPORT_COLUMNS.map((column) => values[column]);
  });

  return toCsv(QUEUE_EXPORT_COLUMNS.map(deps.heading), body);
}
