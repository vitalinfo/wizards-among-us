import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { FaqRow } from "@/components/admin/FaqRow";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { listFaqs } from "@/features/faqs/adminQueries";
import { getSessionActor } from "@/lib/auth/session";
import { isAdmin } from "@/lib/authz";

import { deleteFaqAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminFaqsPage({
  searchParams,
}: {
  searchParams: Promise<{ confirm?: string; id?: string }>;
}) {
  const actor = await getSessionActor();
  if (!isAdmin(actor)) {
    redirect("/admin/login");
  }

  const t = await getTranslations("admin.faqs");
  const [query, faqs] = await Promise.all([searchParams, listFaqs()]);

  // Delete is the only confirmed action. Both halves of the query string must
  // match a real row, so a stale or crafted link resolves to "nothing pending"
  // rather than a modal for an entry that isn't there.
  const target =
    query.confirm === "delete" && query.id
      ? (faqs.find((faq) => faq.id === query.id) ?? null)
      : null;

  return (
    <>
      <AdminNav />
      {/* inert while the modal is up: without it Tab walks into the buttons
          underneath the overlay — the classic fake-modal bug. Needs no JS. */}
      <main
        inert={target !== null}
        className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold">{t("title")}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{t("intro")}</p>
          </div>
          <Link
            href="/admin/faqs/new"
            className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring rounded-md px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {t("newCta")}
          </Link>
        </div>

        {faqs.length === 0 ? (
          <p className="text-muted-foreground">{t("empty")}</p>
        ) : (
          // An ordered list, because the order is the meaning here — it is the
          // order the questions appear in on the landing page.
          <ol className="flex flex-col gap-3">
            {faqs.map((faq, index) => (
              <FaqRow
                key={faq.id}
                faq={faq}
                isFirst={index === 0}
                isLast={index === faqs.length - 1}
              />
            ))}
          </ol>
        )}
      </main>

      {target ? (
        <ConfirmModal
          action={deleteFaqAction.bind(null, target.id)}
          title={t("confirm.delete.title")}
          message={t("confirm.delete.body")}
          confirmLabel={t("deleteCta")}
          cancelHref="/admin/faqs"
        />
      ) : null}
    </>
  );
}
