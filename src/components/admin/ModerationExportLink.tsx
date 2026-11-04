import { buttonVariants } from "@/components/ui/buttonStyles";
import {
  moderationSearch,
  type ModerationQuery,
} from "@/features/applications/moderationFilter";

// Downloads the queue as it is filtered right now — the applied query from the
// url, not whatever is half-typed in the form around it — and every page of it,
// so the page number is dropped.
//
// A plain <a>, not <Link>: the route answers with Content-Disposition:
// attachment, so the browser saves the file and stays on the page. Admin-gated
// and audit-logged there.
//
// Not async: it renders inside ModerationFilterForm, which passes the copy in.
export function ModerationExportLink({
  query,
  label,
  campaignRequired,
  className = "",
}: {
  query: ModerationQuery;
  label: string;
  campaignRequired: string;
  className?: string;
}) {
  // One campaign at a time — the route refuses «Усі кампанії», so the form
  // says why instead of offering a link that would fail.
  if (query.campaign === "all") {
    return (
      <p className={`text-muted-foreground text-sm ${className}`}>
        {campaignRequired}
      </p>
    );
  }

  // The outline button beside «Скинути»; the vertical padding gives back the
  // border's 1.5px so it stands the same height as «Застосувати».
  return (
    <a
      href={`/admin/applications/export?${moderationSearch(query, 1)}`}
      className={`${buttonVariants.outline} focus-visible:outline-ring rounded-md px-4 py-[calc(0.5rem-1.5px)] text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 ${className}`}
    >
      {label}
    </a>
  );
}
