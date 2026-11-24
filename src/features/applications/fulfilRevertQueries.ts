import { and, asc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import type { ApplicationStatus } from "@/db/enums";
import {
  applicationFiles,
  applications,
  auditLogs,
  claims,
  reviews,
} from "@/db/schema";
import type { AdminActor } from "@/lib/actor";

import {
  fulfilRevertBlocker,
  statusBeforeFulfilment,
  type FulfilRevertBlocker,
  type HeldStatus,
} from "./fulfilRevert";

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

// Everything «отримали» left behind, and where the application goes back to.
// What the dry run prints and what the apply removes are this same plan, read
// under the row lock in the apply.
export type FulfilRevertPlan = {
  applicationId: string;
  status: ApplicationStatus;
  blocker: FulfilRevertBlocker | null;
  restoreTo: HeldStatus;
  confirmationFiles: { id: string; storageKey: string; createdAt: Date }[];
  // The parent's own reviews of this application. The confirm dialog redirects
  // straight into the review, so a mistaken confirmation usually has one — and
  // left in place it blocks the real review later (`already_reviewed`).
  reviews: { id: string; isPublished: boolean; createdAt: Date }[];
};

async function loadPlan(
  db: Db | Tx,
  applicationId: string,
  lock: boolean,
): Promise<FulfilRevertPlan | null> {
  const query = db
    .select({ status: applications.status, parentId: applications.parentId })
    .from(applications)
    .where(eq(applications.id, applicationId));
  const [application] = await (lock ? query.for("update") : query);
  if (!application) {
    return null;
  }

  // One after another, not Promise.all: inside the transaction they share one
  // connection, which runs a query at a time anyway (and pg warns about the
  // overlap).
  const [claim] = await db
    .select({ releasedAt: claims.releasedAt })
    .from(claims)
    .where(eq(claims.applicationId, applicationId))
    .limit(1);
  const history = await db
    .select({ action: auditLogs.action })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.targetId, applicationId),
        eq(auditLogs.targetType, "application"),
      ),
    )
    .orderBy(asc(auditLogs.createdAt), asc(auditLogs.id));
  const confirmationFiles = await db
    .select({
      id: applicationFiles.id,
      storageKey: applicationFiles.storageKey,
      createdAt: applicationFiles.createdAt,
    })
    .from(applicationFiles)
    .where(
      and(
        eq(applicationFiles.applicationId, applicationId),
        eq(applicationFiles.kind, "confirmation"),
      ),
    )
    .orderBy(asc(applicationFiles.createdAt));
  const parentReviews = await db
    .select({
      id: reviews.id,
      isPublished: reviews.isPublished,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .where(
      and(
        eq(reviews.applicationId, applicationId),
        eq(reviews.userId, application.parentId),
      ),
    )
    .orderBy(asc(reviews.createdAt));

  return {
    applicationId,
    status: application.status,
    blocker: fulfilRevertBlocker({
      status: application.status,
      claim: claim ?? null,
    }),
    restoreTo: statusBeforeFulfilment(history.map((row) => row.action)),
    confirmationFiles,
    reviews: parentReviews,
  };
}

// The dry run: reads, writes nothing.
export async function planFulfilRevert(
  applicationId: string,
): Promise<FulfilRevertPlan | null> {
  return loadPlan(getDb(), applicationId, false);
}

// One transaction: the status, the confirmation rows, the reviews and their
// audit rows land together or not at all. The plan is read again under the row
// lock, so a parent acting in between is not overwritten by a stale plan.
//
// The audit rows are inserted HERE, not through recordAuditLog: that one
// writes outside the transaction and swallows its own failure (right for a
// user's request, wrong for a hand-run fix, where a missing trail is the bug
// the 2026-11-09 revert had). The actions are the ones the app's own paths
// write, so the admin log and the campaign analytics read them as such:
// `application.fulfil_reverted` is an analytics state event, and
// `application.file_deleted:confirmation` is what the file route records.
//
// Returns the storage keys of the removed files. Deleting the objects is the
// caller's, AFTER the commit — rows first, as everywhere else: a failure in
// between leaves an orphaned object, which is inert.
export async function revertFulfilment(
  applicationId: string,
  admin: AdminActor,
): Promise<{ plan: FulfilRevertPlan; storageKeys: string[] }> {
  return getDb().transaction(async (tx) => {
    const plan = await loadPlan(tx, applicationId, true);
    if (!plan) {
      throw new Error("No application with that id — nothing was changed.");
    }
    if (plan.blocker) {
      throw new Error(`Refused (${plan.blocker}) — nothing was changed.`);
    }

    const updated = await tx
      .update(applications)
      .set({ status: plan.restoreTo })
      .where(
        and(
          eq(applications.id, applicationId),
          eq(applications.status, "fulfilled"),
        ),
      )
      .returning({ id: applications.id });
    if (updated.length !== 1) {
      throw new Error("The status changed under the lock — rolled back.");
    }

    const removedFiles =
      plan.confirmationFiles.length === 0
        ? []
        : await tx
            .delete(applicationFiles)
            .where(
              inArray(
                applicationFiles.id,
                plan.confirmationFiles.map((file) => file.id),
              ),
            )
            .returning({ storageKey: applicationFiles.storageKey });
    const removedReviews =
      plan.reviews.length === 0
        ? []
        : await tx
            .delete(reviews)
            .where(
              inArray(
                reviews.id,
                plan.reviews.map((review) => review.id),
              ),
            )
            .returning({ id: reviews.id });

    const by = {
      actorId: admin.id,
      actorType: "admin" as const,
      actorLabel: admin.email,
      ip: null,
    };
    await tx.insert(auditLogs).values([
      {
        ...by,
        action: "application.fulfil_reverted",
        targetType: "application",
        targetId: applicationId,
      },
      ...removedFiles.map(() => ({
        ...by,
        action: "application.file_deleted:confirmation",
        targetType: "application",
        targetId: applicationId,
      })),
      ...removedReviews.map((review) => ({
        ...by,
        action: "review.deleted",
        targetType: "review",
        targetId: review.id,
      })),
    ]);

    return {
      plan,
      storageKeys: removedFiles.map((file) => file.storageKey),
    };
  });
}
