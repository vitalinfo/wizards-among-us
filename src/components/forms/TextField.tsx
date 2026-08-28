import type { ComponentProps } from "react";

import { controlClass, describedBy, FieldShell } from "./FieldShell";

// Single-line text input. `type` is a real prop so callers can use url/tel and
// get the right mobile keyboard and native validation for free.
export function TextField({
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
} & Omit<ComponentProps<"input">, "id" | "className">) {
  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={props.required}
    >
      <input
        id={id}
        className={controlClass}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, { hint, error })}
        {...props}
      />
    </FieldShell>
  );
}
