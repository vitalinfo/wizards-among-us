import type { ComponentProps } from "react";

import { CaretDownIcon } from "@/components/icons";

import {
  cabinetControlClass,
  controlClass,
  describedBy,
  FieldShell,
  type FieldLook,
} from "./FieldShell";

// Native <select>: keyboard, screen-reader and mobile behaviour come for free,
// which a custom dropdown would have to reimplement (and usually gets wrong).
export function SelectField({
  id,
  label,
  hint,
  error,
  placeholder,
  options,
  look = "default",
  ...props
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  look?: FieldLook;
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
      look={look}
    >
      {look === "cabinet" ? (
        // Still the native select — the caret is drawn over it, not a custom
        // dropdown, so a phone still opens its own picker.
        <div className="relative">
          <select
            id={id}
            className={`${cabinetControlClass} h-[54px] cursor-pointer appearance-none pr-12`}
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
          <CaretDownIcon className="pointer-events-none absolute top-1/2 right-4 size-6 -translate-y-1/2" />
        </div>
      ) : (
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
      )}
    </FieldShell>
  );
}
