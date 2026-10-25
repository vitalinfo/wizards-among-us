import type { ComponentProps } from "react";

import {
  cabinetControlClass,
  controlClass,
  describedBy,
  FieldShell,
  type FieldLook,
} from "./FieldShell";

export function TextAreaField({
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
} & Omit<ComponentProps<"textarea">, "id" | "className">) {
  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={props.required}
      look={look}
    >
      <textarea
        id={id}
        rows={5}
        className={
          look === "cabinet"
            ? `${cabinetControlClass} min-h-[54px] py-[15px]`
            : controlClass
        }
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, { hint, error })}
        {...props}
      />
    </FieldShell>
  );
}
