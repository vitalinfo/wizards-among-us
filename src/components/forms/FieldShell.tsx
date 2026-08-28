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
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required ? (
          <span aria-hidden="true" className="text-muted-foreground ml-0.5">
            *
          </span>
        ) : null}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
      {children}
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

export const controlClass =
  "border-border bg-surface focus-visible:outline-ring w-full rounded-md border px-3 py-2 text-[15px] focus-visible:outline-2 focus-visible:outline-offset-2 aria-[invalid=true]:border-red-600";
