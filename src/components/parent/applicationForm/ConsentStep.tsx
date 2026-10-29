"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";

import { TurnstileWidget } from "@/components/forms/TurnstileWidget";
import { CheckIcon } from "@/components/icons";

import type { StepProps } from "./types";

type ConsentKey =
  | "privacyConsent"
  | "contactConsent"
  | "childWithLetterPhotoConsent"
  | "confirmationConsent"
  | "socialMediaConsent";

// Step 5 — «Згода та підтвердження» (Figma 147:7166): five consents, each a
// round checkbox with its whole text under it, then the captcha.
export function ConsentStep({ values, errors, turnstileSiteKey }: StepProps) {
  const t = useTranslations("parent.form.steps.consent");

  // A string is a paragraph; a nested list is a bulleted list.
  const body = (key: ConsentKey) =>
    (t.raw(`${key}.body`) as (string | string[])[]).map((block) =>
      typeof block === "string" ? (
        <p key={block}>{block}</p>
      ) : (
        <ul key={block.join()} className="list-disc pl-5">
          {block.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ),
    );

  // The three required ones are NOT persisted — they gate submit, so a
  // submitted application has them by definition (submitted_at is the record).
  // The two optional ones are stored, so the hidden «false» comes FIRST: the
  // form keeps the last value of a repeated name, so a ticked box overrides it
  // and an unticked one leaves it, and the answer is always recorded rather
  // than left unknown.
  const consent = (key: ConsentKey, required: boolean) => (
    <Fragment key={key}>
      {required ? null : <input type="hidden" name={key} value="false" />}
      <Consent
        id={key}
        name={key}
        label={t.rich(`${key}.label`, {
          link: (chunks) => (
            <Link
              href="/privacy"
              className="text-primary focus-visible:outline-ring rounded underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {chunks}
            </Link>
          ),
        })}
        defaultChecked={required ? undefined : values[key] === "true"}
        error={errors[key]}
        required={required}
      >
        {body(key)}
      </Consent>
    </Fragment>
  );

  return (
    <fieldset className="flex flex-col gap-8 border-0 p-0">
      <legend className="sr-only">{t("title")}</legend>

      {consent("privacyConsent", true)}
      {consent("contactConsent", true)}
      {/* Optional: without it the claiming volunteer is never shown the
          child-with-letter photo (canViewApplicationFile). */}
      {consent("childWithLetterPhotoConsent", false)}
      {consent("confirmationConsent", true)}
      {consent("socialMediaConsent", false)}

      {/* Only on the final step — the captcha guards SUBMIT, not each draft
          save, so a parent isn't challenged repeatedly while filling the form.
          A captcha failure is reported once, in the form's error summary,
          which also takes focus — repeating it here would announce it twice. */}
      <TurnstileWidget sitekey={turnstileSiteKey ?? null} />
    </fieldset>
  );
}

// One consent: a native checkbox drawn as the design's circle — empty until
// ticked, then filled blue with a white check — its label beside it, and the
// full text it agrees to under the label. The text is the box's description,
// so a screen reader hears what is being agreed to, not just its headline.
function Consent({
  id,
  name,
  label,
  defaultChecked,
  required,
  error,
  children,
}: {
  id: string;
  name: string;
  label: ReactNode;
  defaultChecked?: boolean;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  const describedBy = [`${id}-text`, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="relative mt-0.5 inline-flex size-6 shrink-0">
          <input
            id={id}
            name={name}
            type="checkbox"
            value="true"
            defaultChecked={defaultChecked}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className="peer border-foreground/60 checked:border-primary checked:bg-primary focus-visible:outline-ring size-6 cursor-pointer appearance-none rounded-full border-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          />
          <CheckIcon
            aria-hidden="true"
            className="text-primary-foreground pointer-events-none absolute inset-0 m-auto hidden size-4 peer-checked:block"
          />
        </span>
        <label
          htmlFor={id}
          className="cursor-pointer text-base leading-[22px] font-medium tracking-[-0.03em]"
        >
          {label}
          {required ? (
            <span aria-hidden="true" className="text-muted-foreground">
              *
            </span>
          ) : null}
        </label>
      </div>
      <div
        id={`${id}-text`}
        className="text-muted-foreground flex flex-col gap-3 pl-9 text-xs leading-4 tracking-[-0.03em]"
      >
        {children}
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-danger pl-9 text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
