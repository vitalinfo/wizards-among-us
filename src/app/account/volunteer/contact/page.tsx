import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { VolunteerPhoneForm } from "@/components/volunteer/VolunteerPhoneForm";
import { isUser } from "@/lib/actor";
import { safeReturnPath, signedOutRedirect } from "@/lib/auth/returnPath";
import { getSessionActor } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// Where a volunteer without a Telegram @username lands when they try to claim.
// Not a nag screen: without a handle or a phone there is no way for the family
// to reach them, so this is the one thing standing between them and a child.
export default async function VolunteerContactPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    redirect(signedOutRedirect(actor, "/account/volunteer/contact"));
  }
  const { next } = await searchParams;
  const returnTo = safeReturnPath(next) || "/account/volunteer/children";
  const t = await getTranslations("volunteer.contact");
  const tBack = await getTranslations("volunteer");

  return (
    <>
      <div className="mx-auto w-full max-w-lg py-10">
        <Link
          href="/account/volunteer/children"
          className="text-primary text-sm font-semibold underline underline-offset-4"
        >
          {tBack("backToChildren")}
        </Link>
        <h1 className="mt-4 text-3xl font-semibold">{t("title")}</h1>
        <p className="text-body mt-2 text-sm leading-relaxed">{t("body")}</p>
        <div className="mt-6">
          <VolunteerPhoneForm next={returnTo} />
        </div>
      </div>
    </>
  );
}
