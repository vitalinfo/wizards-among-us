import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { FaqForm } from "@/components/admin/FaqForm";
import { getAdminFaq } from "@/features/faqs/adminQueries";
import { getSessionActor } from "@/lib/auth/session";
import { isAdmin } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function EditFaqPage({
  params,
}: {
  params: Promise<{ faqId: string }>;
}) {
  const { faqId } = await params;
  const actor = await getSessionActor();
  if (!isAdmin(actor)) {
    redirect("/admin/login");
  }

  const faq = await getAdminFaq(faqId);
  if (!faq) {
    notFound();
  }
  const t = await getTranslations("admin.faqs");

  return (
    <>
      <AdminNav />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
        <Link
          href="/admin/faqs"
          className="text-primary text-sm font-semibold underline underline-offset-4"
        >
          {t("backCta")}
        </Link>
        <div>
          <h1 className="text-3xl font-semibold">{t("editTitle")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{faq.title}</p>
        </div>
        <FaqForm faq={faq} />
      </main>
    </>
  );
}
