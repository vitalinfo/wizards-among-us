import type { ReactNode } from "react";

// Shared label / hint / error scaffolding for every form control, so the
// accessibility wiring is written once and can't be forgotten on a new field:
//   • a visible <label htmlFor> (a placeholder is not a label)
//   • hint and error linked via aria-describedby
//   • the error announced politely, not silently swapped in
//
// Controls get their ids from here: `${id}`, `${id}-hint`, `${id}-error`.
export function FieldShell({
  id,
  label,
  hint,
  error,
  required,
  look = "default",
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  // `cabinet` is the redesign's (Figma 147:7166): a lighter label, the hint
  // UNDER the control, and more air. `default` is everything not yet redrawn —
  // the admin forms.
  look?: FieldLook;
  children: ReactNode;
}) {
  const hintNode = hint ? (
    <p
      id={`${id}-hint`}
      className={
        look === "cabinet"
          ? "text-muted-foreground text-xs tracking-[-0.03em]"
          : "text-muted-foreground text-xs"
      }
    >
      {hint}
    </p>
  ) : null;

  return (
    <div
      className={
        look === "cabinet"
          ? "flex flex-col gap-2 py-3"
          : "flex flex-col gap-1.5"
      }
    >
      <label
        htmlFor={id}
        className={
          look === "cabinet"
            ? "text-sm tracking-[-0.06em]"
            : "text-sm font-medium"
        }
      >
        {label}
        {required ? (
          <span
            aria-hidden="true"
            className={
              look === "cabinet"
                ? "text-muted-foreground"
                : "text-muted-foreground ml-0.5"
            }
          >
            *
          </span>
        ) : null}
      </label>
      {look === "default" ? hintNode : null}
      {children}
      {look === "cabinet" ? hintNode : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

// The aria-describedby value a control should carry, given which of hint/error
// are present. Kept next to FieldShell so the two can't drift apart.
export function describedBy(
  id: string,
  { hint, error }: { hint?: string; error?: string },
): string | undefined {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(
    Boolean,
  );
  return ids.length > 0 ? ids.join(" ") : undefined;
}

export type FieldLook = "default" | "cabinet";

// The redesign's control (Figma 147:7166): 54px tall, 8px corners, a light
// border, 14px text. Its placeholder is the muted token, not the design's 60%
// grey (3.4:1): on this form the placeholders carry what a field is FOR —
// «Чарівник до вибору бачить лише ім'я» — so they are held to the text
// threshold.
export const cabinetControlClass =
  "border-divider bg-surface placeholder:text-muted-foreground focus-visible:outline-ring w-full rounded-lg border px-4 text-sm tracking-[-0.06em] focus-visible:outline-2 focus-visible:outline-offset-2 aria-[invalid=true]:border-danger";

export const controlClass =
  "border-border bg-surface focus-visible:outline-ring w-full rounded-md border px-3 py-2 text-[15px] focus-visible:outline-2 focus-visible:outline-offset-2 aria-[invalid=true]:border-red-600";
