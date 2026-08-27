import type { ComponentProps } from "react";

import { controlClass, describedBy, FieldShell } from "./FieldShell";

// Native <select>: keyboard, screen-reader and mobile behaviour come for free,
// which a custom dropdown would have to reimplement (and usually gets wrong).
export function SelectField({
  id,
  label,
  hint,
  error,
  placeholder,
  options,
  ...props
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  placeholder: string;
  options: readonly { value: string; label: string }[];
} & Omit<ComponentProps<"select">, "id" | "className" | "children">) {
  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={props.required}
    >
      <select
        id={id}
        className={controlClass}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, { hint, error })}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
