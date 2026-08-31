import { getTranslations } from "next-intl/server";
import Link from "next/link";

// Choose an export scope for one campaign. Same page-state mechanism as
// ConfirmModal (?export=<id> → overlay + `inert` behind), so it needs no client
// JavaScript.
//
// The two scopes are described in full HERE rather than on a settings page,
// because this is the moment the choice is made: the difference between them is
// whether a leaked file can identify a family, and that belongs next to the
// button, not somewhere an admin read once.
//
// The downloads are plain <a>, not <Link>: the route answers with
// Content-Disposition: attachment, so the browser saves the file and leaves the
// page — and the modal — where it is, which is what you want when pulling both.
export async function ExportModal({
  campaignId,
  campaignTitle,
  cancelHref,
}: {
  campaignId: string;
  campaignTitle: string;
  cancelHref: string;
}) {
  const t = await getTranslations("admin.export");

  const href = (scope: "coordination" | "full") =>
    `/admin/export/download?campaignId=${campaignId}&scope=${scope}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-title"
        tabIndex={-1}
        autoFocus
        className="bg-surface text-foreground border-border w-[min(34rem,100%)] rounded-lg border p-5 shadow-lg"
      >
        <h2 id="export-title" className="text-lg font-semibold">
          {t("modalTitle")}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">{campaignTitle}</p>

        <div className="mt-4 flex flex-col gap-4">
          <div>
            <p className="text-sm font-semibold">
              {t("scopes.coordination.title")}
            </p>
            <p className="text-body mt-1 text-sm">
              {t("scopes.coordination.body")}
            </p>
            <a
              href={href("coordination")}
              className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring mt-2 inline-block rounded-md px-3 py-1.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {t("scopes.coordination.download")}
            </a>
          </div>

          <div className="border-border border-t pt-4">
            <p className="text-sm font-semibold">{t("scopes.full.title")}</p>
            <p className="text-body mt-1 text-sm">{t("scopes.full.body")}</p>
            <a
              href={href("full")}
              className="border-border hover:bg-surface-muted focus-visible:outline-ring mt-2 inline-block rounded-md border px-3 py-1.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {t("scopes.full.download")}
            </a>
          </div>
        </div>

        <p className="text-muted-foreground mt-4 text-xs">{t("noFiles")}</p>

        <div className="mt-5 flex justify-end">
          <Link
            href={cancelHref}
            className="border-border hover:bg-surface-muted focus-visible:outline-ring rounded-md border px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {t("close")}
          </Link>
        </div>
      </div>
    </div>
  );
}
