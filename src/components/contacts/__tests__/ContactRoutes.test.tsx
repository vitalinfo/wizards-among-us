import { NextIntlClientProvider } from "next-intl";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import messages from "../../../../messages/uk.json";
import { axe } from "@/test/axe";
import { ContactRoutes } from "../ContactRoutes";
import { TeamNote } from "../TeamNote";

function renderRoutes() {
  return render(
    <NextIntlClientProvider locale="uk" messages={messages}>
      <ContactRoutes />
    </NextIntlClientProvider>,
  );
}

describe("ContactRoutes", () => {
  it("sends every card to a page in the app, never to an inbox", () => {
    renderRoutes();

    const hrefs = Object.fromEntries(
      screen
        .getAllByRole("link")
        .map((el) => [el.textContent?.trim(), el.getAttribute("href")]),
    );
    expect(hrefs).toEqual({
      [messages.contacts.routes.volunteer]: "/volunteer",
      [messages.contacts.routes.parent]: "/parent",
      [messages.contacts.routes.company]: "/partners",
    });
  });

  // The design fills the middle card blue. That is the HOVER state drawn on
  // one card, not a card that rests different from its neighbours — getting
  // this backwards is what the first pass did.
  it("rests all three cards on the same surface", () => {
    renderRoutes();

    const fills = screen
      .getAllByRole("link")
      .map((el) => el.className.includes("bg-surface"));
    expect(fills).toEqual([true, true, true]);
  });

  it("names every card by its label, with no arrow leaking into the name", () => {
    renderRoutes();

    expect(
      screen.getAllByRole("link").map((el) => el.textContent?.trim()),
    ).toEqual([
      messages.contacts.routes.volunteer,
      messages.contacts.routes.parent,
      messages.contacts.routes.company,
    ]);
  });

  it("has no accessibility violations", async () => {
    const { container } = renderRoutes();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("TeamNote", () => {
  // The design drops this block on mobile; we keep it, so a test pins that it
  // renders at all — and that the highlighted clause is one sentence, not two
  // paragraphs glued together by the rich-text tags.
  it("renders both sentences, with the hard break the design draws", () => {
    const { container } = render(
      <NextIntlClientProvider locale="uk" messages={messages}>
        <TeamNote />
      </NextIntlClientProvider>,
    );

    const lines = [...container.querySelectorAll("p")].map(
      (p) => p.textContent,
    );
    expect(lines).toEqual([
      messages.contacts.note.replace(/<\/?em>/g, ""),
      messages.contacts.noteThanks,
    ]);
  });
});
