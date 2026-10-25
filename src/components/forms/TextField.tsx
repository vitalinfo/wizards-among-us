import type { ComponentProps } from "react";

import {
  cabinetControlClass,
  controlClass,
  describedBy,
  FieldShell,
  type FieldLook,
} from "./FieldShell";

// Single-line text input. `type` is a real prop so callers can use url/tel and
// get the right mobile keyboard and native validation for free.
export function TextField({
  id,
  label,
  hint,
  error,
  look = "default",
  ...props
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  look?: FieldLook;
} & Omit<ComponentProps<"input">, "id" | "className">) {
  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={props.required}
      look={look}
    >
      <input
        id={id}
        className={
          look === "cabinet" ? `${cabinetControlClass} h-[54px]` : controlClass
        }
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, { hint, error })}
        {...props}
      />
    </FieldShell>
  );
}
