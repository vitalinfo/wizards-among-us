import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import messages from "../../../../messages/uk.json";
import type { PublicFaq } from "@/features/faqs/queries";
import { axe } from "@/test/axe";

import { Faq } from "../Faq";

const items: PublicFaq[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Хто може подати заявку?",
    description: "Родини з дітьми, які через війну виїхали з дому.",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    title: "Чи побачать волонтери адресу моєї дитини?",
    description:
      "Ні. Контакти відкриваються тільки тому Чарівнику, який узяв вашу заявку.",
  },
];

function renderFaq(rows: readonly PublicFaq[] = items) {
  return render(
    <NextIntlClientProvider locale="uk" messages={messages}>
      <Faq items={rows} />
    </NextIntlClientProvider>,
  );
}

describe("Faq", () => {
  it("renders one row per entry, in the order it was given", () => {
    renderFaq();

    const questions = screen
      .getAllByRole("group")
      .map((row) => row.querySelector("summary")?.textContent);
    expect(questions[0]).toContain(items[0].title);
    expect(questions[1]).toContain(items[1].title);
  });

  // The heading and lead-in are still copy; only the questions come from the DB.
  it("keeps the section heading in the message file", () => {
    renderFaq();

    expect(
      screen.getByRole("heading", { name: messages.landing.faq.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(messages.landing.faq.subtitle)).toBeVisible();
  });

  // <details>, not a JS accordion — the answers are the page's factual claims
  // and must open with a broken bundle. Opening one is the browser's job, so
  // what we assert is that the answer is reachable through the summary.
  it("reveals the answer when its question is opened", async () => {
    const user = userEvent.setup();
    renderFaq();

    const answer = screen.getByText(items[0].description);
    expect(answer.closest("details")).not.toHaveAttribute("open");

    await user.click(screen.getByText(items[0].title));
    expect(answer.closest("details")).toHaveAttribute("open");
  });

  // No entries means no section, not a heading over an empty box — and there is
  // deliberately no hardcoded fallback copy, so a DB failure must not print an
  // outdated privacy promise.
  it("renders nothing at all when there are no active entries", () => {
    const { container } = renderFaq([]);

    expect(container).toBeEmptyDOMElement();
    expect(
      screen.queryByRole("heading", { name: messages.landing.faq.title }),
    ).not.toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = renderFaq();
    expect(await axe(container)).toHaveNoViolations();
  });
});
