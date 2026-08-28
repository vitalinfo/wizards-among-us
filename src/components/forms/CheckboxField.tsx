import type { ComponentProps } from "react";

import { describedBy } from "./FieldShell";

// Checkbox with the label beside the box (not above it), which is the shape
// people expect for a consent. The a11y wiring matches the other fields.
export function CheckboxField({
  id,
  label,
  hint,
  error,
  ...props
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
} & Omit<ComponentProps<"input">, "id" | "className" | "type">) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start gap-2.5">
        <input
          id={id}
          type="checkbox"
          className="focus-visible:outline-ring mt-1 size-4 shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, { hint, error })}
          {...props}
        />
        <label htmlFor={id} className="text-sm leading-relaxed">
          {label}
        </label>
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="text-muted-foreground ml-6.5 text-xs">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="ml-6.5 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
