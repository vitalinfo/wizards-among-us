import { describedBy } from "./FieldShell";

// A yes/no question. <fieldset>/<legend> is what makes a screen reader announce
// the question with each option — a plain div with a heading does not.
export function RadioGroupField({
  name,
  legend,
  hint,
  error,
  options,
  defaultValue,
  required,
}: {
  name: string;
  legend: string;
  hint?: string;
  error?: string;
  options: readonly { value: string; label: string }[];
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <fieldset
      className="flex flex-col gap-2 border-0 p-0"
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(name, { hint, error })}
    >
      <legend className="text-sm font-medium">{legend}</legend>
      {hint ? (
        <p id={`${name}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
      {options.map((option) => {
        const id = `${name}-${option.value}`;
        return (
          <div key={option.value} className="flex items-center gap-2.5">
            <input
              id={id}
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={defaultValue === option.value}
              required={required}
              className="focus-visible:outline-ring size-4 focus-visible:outline-2 focus-visible:outline-offset-2"
            />
            <label htmlFor={id} className="text-sm">
              {option.label}
            </label>
          </div>
        );
      })}
      {error ? (
        <p id={`${name}-error`} role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
