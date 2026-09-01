import { NextIntlClientProvider } from "next-intl";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../../../../messages/uk.json";
import { locale } from "@/i18n/request";
import { MAX_USER_NOTE_LENGTH } from "@/features/users/noteState";
import { axe } from "@/test/axe";

const result = vi.hoisted(() => ({ current: { status: "saved" } as const }));
const saved = vi.hoisted(() => ({ calls: [] as FormData[] }));

vi.mock("@/app/admin/users/actions", () => ({
  saveUserNoteAction: vi.fn(
    async (_userId: string, _prev: unknown, formData: FormData) => {
      saved.calls.push(formData);
      return result.current;
    },
  ),
}));

import { UserNoteForm } from "../UserNoteForm";

const t = messages.admin.users.note;

function wrap(note: string | null = null) {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <UserNoteForm userId="u1" note={note} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  saved.calls = [];
});

describe("UserNoteForm", () => {
  it("shows the note already saved for this person", () => {
    wrap("телефон не відповідає");
    expect(screen.getByLabelText(t.label)).toHaveValue("телефон не відповідає");
  });

  it("sends what the admin typed", async () => {
    const user = userEvent.setup();
    wrap();

    await user.type(screen.getByLabelText(t.label), "писали в TG 02.09");
    await user.click(screen.getByRole("button", { name: t.save }));

    expect(await screen.findByText(t.saved)).toBeVisible();
    expect(saved.calls.at(-1)?.get("note")).toBe("писали в TG 02.09");
  });

  // Nothing about the button changes on success, so without a live region a
  // screen-reader user gets no confirmation the note went anywhere.
  it("announces the result", async () => {
    const user = userEvent.setup();
    wrap();

    await user.type(screen.getByLabelText(t.label), "нотатка");
    await user.click(screen.getByRole("button", { name: t.save }));

    expect(await screen.findByRole("status")).toHaveTextContent(t.saved);
  });

  // The column is unbounded text; the cap is a product decision (a coordination
  // note, not a case file) and the server re-checks it.
  it("stops the textarea past the limit", () => {
    wrap();
    expect(screen.getByLabelText(t.label)).toHaveAttribute(
      "maxlength",
      String(MAX_USER_NOTE_LENGTH),
    );
  });

  it("has no accessibility violations", async () => {
    const { container } = wrap("нотатка");
    expect(await axe(container)).toHaveNoViolations();
  });
});
