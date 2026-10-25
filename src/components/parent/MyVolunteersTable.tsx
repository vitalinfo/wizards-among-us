import { getTranslations } from "next-intl/server";

import { WizardHatIcon } from "@/components/icons";
import { ClaimStatusBadge } from "@/components/volunteer/ClaimStatusBadge";
import type { MyVolunteerRow } from "@/features/applications/queries";
import { resolveUserContact } from "@/features/users/contact";
import { cn } from "@/lib/utils";

// «Мої Чарівники» (Figma 142:6503) — who holds each of this family's children,
// and how to reach them.
//
// A real <table> from lg, its rows drawn as separate cards (border-spacing),
// as on «Мої заявки»; cards below lg.
//
// ONE contact per volunteer, not the two the design prints. resolveUserContact
// is the single answer to "how do we reach this person": the Telegram handle,
// and the phone only for someone who has none. Printing both would put a
// volunteer's phone in front of a family even when they gave a handle, which
// is not what the phone was collected for.
export async function MyVolunteersTable({
  rows,
}: {
  rows: readonly MyVolunteerRow[];
}) {
  const t = await getTranslations("parent.myVolunteer");

  const name = (row: MyVolunteerRow) => row.volunteerFirstName ?? t("unnamed");
  const child = (row: MyVolunteerRow) =>
    t("forChild", { child: row.childName ?? t("childFallback") });
  const state = (row: MyVolunteerRow) =>
    row.status === "fulfilled" ? ("completed" as const) : ("active" as const);
  const contactOf = (row: MyVolunteerRow) =>
    resolveUserContact({
      username: row.volunteerUsername,
      phone: row.volunteerPhone,
    });

  // The contact as a link a parent can tap: Telegram opens the chat, a phone
  // dials. Named by what it is as well as by its value.
  const contactLink = (row: MyVolunteerRow) => {
    const contact = contactOf(row);
    if (!contact) {
      // Should be unreachable: the claim gate requires a contact.
      return <span className="text-muted-foreground">{t("noContact")}</span>;
    }
    return contact.method === "telegram" ? (
      <a
        href={`https://t.me/${contact.value}`}
        target="_blank"
        rel="noreferrer noopener"
        className={LINK}
      >
        @{contact.value}
      </a>
    ) : (
      <a href={`tel:${contact.value}`} className={LINK}>
        {contact.value}
      </a>
    );
  };
  const contactKind = (row: MyVolunteerRow) => {
    const contact = contactOf(row);
    return contact ? t(`contactMethod.${contact.method}`) : null;
  };

  const head =
    "bg-surface-muted py-[21px] font-normal first:rounded-l-xl last:rounded-r-xl";
  const cell =
    "border-divider border-y py-8 align-middle first:rounded-l-lg first:border-l last:rounded-r-lg last:border-r";

  return (
    <>
      {/* The table, from lg. Columns in the design's proportions of its
          1283px row: 306 / 233 / 423 / the status. */}
      <div className="border-divider bg-surface hidden rounded-lg border px-[13px] lg:block">
        <table className="w-full table-fixed border-separate border-spacing-y-2 text-left">
          <caption className="sr-only">{t("tableCaption")}</caption>
          <colgroup>
            <col className="w-[24%]" />
            <col className="w-[18%]" />
            <col className="w-[33%]" />
            <col />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className={cn(head, "pl-[33px]")}>
                {t("columns.volunteer")}
              </th>
              <th scope="col" className={head}>
                {t("columns.contact")}
              </th>
              <th scope="col" className={head}>
                {t("columns.initiative")}
              </th>
              {/* The pills sit at the START of the column, as drawn, with the
                  space after them empty — and the header is centred over a
                  pill's width, not over the whole column. 179 is the widest,
                  «Допомогу завершено». */}
              <th scope="col" className={head}>
                <span className="inline-block w-[179px] text-center">
                  {t("columns.status")}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.applicationId}>
                <td className={cn(cell, "pl-[21px]")}>
                  <div className="flex items-center gap-6">
                    <Avatar odd={index % 2 === 0} />
                    <span className="flex min-w-0 flex-col gap-2">
                      <span className="text-lg leading-4 font-medium tracking-[-0.06em]">
                        {name(row)}
                      </span>
                      <span className="text-sm font-light tracking-[-0.06em]">
                        {child(row)}
                      </span>
                    </span>
                  </div>
                </td>
                <td className={cn(cell, "text-sm tracking-[-0.06em]")}>
                  <span className="flex flex-col gap-2">
                    <span className="leading-4 font-medium">
                      {contactLink(row)}
                    </span>
                    {contactKind(row) ? (
                      <span className="font-light">{contactKind(row)}</span>
                    ) : null}
                  </span>
                </td>
                <td
                  className={cn(
                    cell,
                    "text-lg leading-4 font-medium tracking-[-0.06em]",
                  )}
                >
                  {row.campaignTitle}
                </td>
                <td className={cell}>
                  <ClaimStatusBadge
                    state={state(row)}
                    label={t(`state.${state(row)}`)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* The cards, below lg. */}
      <ul className="flex flex-col gap-3 lg:hidden">
        {rows.map((row) => (
          <li
            key={row.applicationId}
            className="border-divider bg-surface flex flex-col items-start gap-[18px] rounded-lg border px-[13px] py-5"
          >
            <ClaimStatusBadge
              state={state(row)}
              label={t(`state.${state(row)}`)}
            />
            <div className="flex flex-col gap-2 text-sm font-light tracking-[-0.06em]">
              <p className="text-lg leading-[19px] font-medium">{name(row)}</p>
              <p>{child(row)}</p>
              <p>
                {t("columns.initiative")}:{" "}
                <span className="font-medium">{row.campaignTitle}</span>
              </p>
              <p>
                {t("contacts")}:{" "}
                <span className="font-medium">
                  {contactKind(row) ? `${contactKind(row)} ` : null}
                  {contactLink(row)}
                </span>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

const LINK =
  "text-primary focus-visible:outline-ring rounded hover:underline focus-visible:outline-2 focus-visible:outline-offset-2";

// The hat in a disc. Decorative — the name is beside it — and the tint means
// nothing: the design alternates it, pink on odd rows and violet on even ones
// (Vital). The design's 12% fills flattened onto white.
function Avatar({ odd }: { odd: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-full",
        odd ? "bg-[#ffe6fa] text-[#ff33d3]" : "bg-[#e8e4ff] text-[#431dff]",
      )}
    >
      <WizardHatIcon className="size-6" />
    </span>
  );
}
