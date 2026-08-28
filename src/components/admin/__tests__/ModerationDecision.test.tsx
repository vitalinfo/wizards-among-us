import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../../../../messages/uk.json";
import type { ModerationActionState } from "@/features/applications/moderationState";

// The server action itself needs a DB and an admin session, so it can't run in
// jsdom. It's replaced by a spy that CAPTURES the FormData — the assertions are
// about what our form submits, which is our code, not the stub's behaviour.
const submitted: FormData[] = [];
let nextResult: ModerationActionState = { status: "done" };

vi.mock("@/app/admin/applications/actions", () => ({
  decideApplicationAction: vi.fn(
    async (_prev: ModerationActionState, formData: FormData) => {
      submitted.push(formData);
      return nextResult;
    },
  ),
}));

const { ModerationDecision } = await import("../ModerationDecision");

const t = messages.admin.applications;

function renderForm() {
  return render(
    <NextIntlClientProvider locale="uk" messages={messages}>
      <ModerationDecision applicationId="app-1" />
    </NextIntlClientProvider>,
  );
}

describe("ModerationDecision", () => {
  beforeEach(() => {
    submitted.length = 0;
    nextResult = { status: "done" };
  });

  it("sends the approve decision with the application id", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: t.decision.approve }));

    expect(submitted).toHaveLength(1);
    expect(submitted[0].get("decision")).toBe("approved");
    expect(submitted[0].get("applicationId")).toBe("app-1");
  });

  it("sends the reject decision together with the note", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(
      screen.getByLabelText(t.decision.noteLabel),
      "Дитині вже 18.",
    );
    await user.click(screen.getByRole("button", { name: t.decision.reject }));

    expect(submitted[0].get("decision")).toBe("rejected");
    expect(submitted[0].get("rejectionNote")).toBe("Дитині вже 18.");
  });

  it("flags the note field when a rejection has no reason", async () => {
    nextResult = { status: "note_required" };
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: t.decision.reject }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      t.errors.note_required,
    );
    expect(screen.getByLabelText(t.decision.noteLabel)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  // Two admins working the same queue: the second decision must not silently
  // look like it landed.
  it("reports a decision that someone else already made", async () => {
    nextResult = { status: "already_decided" };
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: t.decision.approve }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      t.errors.already_decided,
    );
  });

  it("labels the note field and links its hint", () => {
    renderForm();
    const note = screen.getByLabelText(t.decision.noteLabel);
    expect(note).toHaveAccessibleDescription(t.decision.noteHint);
  });
});
