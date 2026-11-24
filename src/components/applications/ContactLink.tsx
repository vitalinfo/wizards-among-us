import type { ContactMethod } from "@/db/enums";

// A resolved contact as something to tap: Telegram opens the chat, a phone
// dials. The family's own on their card, the volunteer's in «Чарівник».
export function ContactLink({
  contact,
}: {
  contact: { method: ContactMethod; value: string };
}) {
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
}

const LINK =
  "text-primary focus-visible:outline-ring underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2";
