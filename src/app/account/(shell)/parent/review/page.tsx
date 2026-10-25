import { redirect } from "next/navigation";

import {
  applicationsHref,
  dialogHref,
} from "@/features/applications/applicationTabs";

export const dynamic = "force-dynamic";

// The review is a dialog over «Мої заявки» now (Figma 142:5726). This url stays
// as a redirect into it, so a link to the old page still works. The dialog
// does the checks; one that may not be reviewed opens nothing.
export default async function LeaveReviewRedirect({
  searchParams,
}: {
  searchParams: Promise<{ application?: string }>;
}) {
  const { application } = await searchParams;
  redirect(
    application
      ? dialogHref({ tab: "all", page: 1 }, "review", application)
      : applicationsHref(),
  );
}
