import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { Modal } from "../Modal";

function renderModal() {
  return render(
    <Modal
      title="Залишити відгук"
      description="Розкажіть, як усе пройшло."
      closeHref="/account/parent/applications?tab=claimed"
      closeLabel="Закрити"
    >
      <button type="button">Надіслати відгук</button>
    </Modal>,
  );
}

describe("Modal", () => {
  // Named by its title and described by its sentence, so a screen reader
  // announces what the dialog is for when focus lands in it.
  it("is a modal dialog named and described by its own text", () => {
    renderModal();

    const dialog = screen.getByRole("dialog", { name: "Залишити відгук" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleDescription("Розкажіть, як усе пройшло.");
  });

  // × is a LINK back to the list — closing works with no script at all.
  it("closes with a link back to where it was opened from", () => {
    renderModal();

    expect(screen.getByRole("link", { name: "Закрити" })).toHaveAttribute(
      "href",
      "/account/parent/applications?tab=claimed",
    );
  });

  it("has no accessibility violations", async () => {
    const { container } = renderModal();
    expect(await axe(container)).toHaveNoViolations();
  });
});
