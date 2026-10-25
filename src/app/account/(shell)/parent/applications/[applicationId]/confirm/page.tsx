import { redirect } from "next/navigation";

import {
  dialogHref,
  parseApplicationsQuery,
} from "@/features/applications/applicationTabs";

export const dynamic = "force-dynamic";

// Confirming the gift is a dialog over «Мої заявки» now (Figma 142:5726). This
// url stays as a redirect into it, so a link to the old page — a bookmark, an
// earlier message — still lands somewhere that works. The dialog does the
// checks; an id that is not this parent's opens nothing.
export default async function ConfirmReceiptRedirect({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  redirect(dialogHref(parseApplicationsQuery({}), "receive", applicationId));
}
