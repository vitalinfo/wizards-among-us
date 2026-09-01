import { getTranslations } from "next-intl/server";
import Link from "next/link";

// A modal confirmation that needs NO client JavaScript.
//
// The trigger is a plain <Link> carrying ?confirm=<action>&id=<id>. The page
// re-renders with this overlay on top and the page content marked `inert`, and
// the confirm control is an ordinary <form> posting a server action.
//
// Why not <dialog> + showModal(): that version was correct in every browser we
// could test and still never ran on the reviewer's machine, so a destructive
// action fired with no prompt at all and archived a live campaign. A
// confirmation whose only job is to prevent a mistake must not depend on
// hydration succeeding. If the page rendered, the confirmation works.
//
// What a real <dialog> gives us that this doesn't: closing on Escape. That needs
// a key handler, so it is the one affordance we give up; cancelling is a visible
// control instead. Focus containment we DO get, from `inert` on the content
// behind (see the pages that render this) — without it, Tab would walk into the
// buttons under the overlay, which is the classic fake-modal bug.
export async function ConfirmModal({
  action,
  title,
  message,
  confirmLabel,
  cancelHref,
}: {
  action: () => Promise<void>;
  title: string;
  // What actually happens, in plain words — the point of the whole step.
  message: string;
  confirmLabel: string;
  cancelHref: string;
}) {
  const t = await getTranslations("common.confirm");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      {/* autoFocus + tabIndex -1 puts focus on the dialog itself when the page
          loads, so a keyboard or screen-reader user starts inside the question
          rather than at the top of an inert page. Deliberately NOT on the
          confirm button: Enter should not complete a destructive action. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        tabIndex={-1}
        autoFocus
        className="bg-surface text-foreground border-border w-[min(28rem,100%)] rounded-lg border p-5 shadow-lg"
      >
        <h2 id="confirm-title" className="text-lg font-semibold">
          {title}
        </h2>
        <p id="confirm-message" className="text-body mt-2 text-sm">
          {message}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          <Link
            href={cancelHref}
            className="border-border hover:bg-surface-muted focus-visible:outline-ring rounded-md border px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {t("cancel")}
          </Link>
          <form action={action}>
            <button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring rounded-md px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {confirmLabel}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
