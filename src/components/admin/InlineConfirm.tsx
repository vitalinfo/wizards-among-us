import { getTranslations } from "next-intl/server";
import Link from "next/link";

// A confirmation step that needs NO client JavaScript.
//
// The trigger is a plain <Link> carrying ?confirm=<action>&id=<id>; the page
// re-renders server-side with this panel in place of the buttons, and the
// confirm control is an ordinary <form> posting a server action.
//
// It replaced a native <dialog> + showModal() version. That one was correct in
// every browser we could test, and still silently did nothing on Vital's — the
// handler never ran, so a destructive action either no-oped or (after the
// fallback) fired with no prompt at all. A confirmation whose whole purpose is
// to prevent a mistake must not itself depend on hydration succeeding: if the
// page rendered, the confirmation works.
export async function InlineConfirm({
  action,
  title,
  message,
  confirmLabel,
  cancelHref,
  anchorId,
}: {
  action: () => Promise<void>;
  title: string;
  // What actually happens, in plain words — the point of the step.
  message: string;
  confirmLabel: string;
  cancelHref: string;
  anchorId: string;
}) {
  const t = await getTranslations("common.confirm");

  return (
    // tabIndex -1 + the id let the trigger link jump focus here, so a keyboard
    // or screen-reader user lands on the question instead of the page top.
    <div
      id={anchorId}
      tabIndex={-1}
      role="group"
      aria-label={title}
      className="border-primary/40 bg-primary/5 flex flex-col gap-2 rounded-lg border p-4"
    >
      <p className="font-semibold">{title}</p>
      <p className="text-body text-sm">{message}</p>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <form action={action}>
          <button
            type="submit"
            className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring rounded-md px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {confirmLabel}
          </button>
        </form>
        <Link
          href={cancelHref}
          className="text-primary text-sm font-semibold underline underline-offset-4"
        >
          {t("cancel")}
        </Link>
      </div>
    </div>
  );
}
