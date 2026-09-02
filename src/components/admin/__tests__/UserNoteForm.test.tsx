import { NextIntlClientProvider } from "next-intl";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../../../../messages/uk.json";
import { locale } from "@/i18n/config";
import { MAX_USER_NOTE_LENGTH } from "@/features/users/noteState";
import { axe } from "@/test/axe";

const result = vi.hoisted(() => ({
  current: { status: "idle" } as { status: string },
}));
const saved = vi.hoisted(() => ({ calls: [] as FormData[] }));

vi.mock("@/app/admin/users/actions", () => ({
  saveUserNoteAction: vi.fn(
    async (
      _userId: string,
      _returnTo: string,
      _prev: unknown,
      formData: FormData,
    ) => {
      saved.calls.push(formData);
      return result.current;
    },
  ),
}));

import { UserNoteForm } from "../UserNoteForm";

const t = messages.admin.users.note;
const RETURN_TO = "/admin/users?q=коваль";

function wrap(note: string | null = null) {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <UserNoteForm
        userId="u1"
        note={note}
        returnTo={RETURN_TO}
        cancelLabel={t.cancel}
      />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  saved.calls = [];
  result.current = { status: "idle" };
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

    await waitFor(() =>
      expect(saved.calls.at(-1)?.get("note")).toBe("писали в TG 02.09"),
    );
  });

  // On success the action redirects, so this form only ever renders failures.
  // Nothing else on the page moves when one happens, so without a live region a
  // screen-reader user is left staring at an unchanged form.
  it("announces a refusal and marks the field", async () => {
    const user = userEvent.setup();
    result.current = { status: "too_long" };
    wrap();

    await user.type(screen.getByLabelText(t.label), "нотатка");
    await user.click(screen.getByRole("button", { name: t.save }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      t.tooLong.replace("{max}", String(MAX_USER_NOTE_LENGTH)),
    );
    expect(screen.getByLabelText(t.label)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  // Leaving without saving must not need the browser's back button — and it has
  // to land back on the list the admin came from, search and page intact.
  it("offers a way out that returns to the list", () => {
    wrap();

    expect(screen.getByRole("link", { name: t.cancel })).toHaveAttribute(
      "href",
      RETURN_TO,
    );
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
