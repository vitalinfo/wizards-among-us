import type { ComponentProps } from "react";

import { controlClass, describedBy, FieldShell } from "./FieldShell";

export function TextAreaField({
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
} & Omit<ComponentProps<"textarea">, "id" | "className">) {
  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={props.required}
    >
      <textarea
        id={id}
        rows={5}
        className={controlClass}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, { hint, error })}
        {...props}
      />
    </FieldShell>
  );
}
