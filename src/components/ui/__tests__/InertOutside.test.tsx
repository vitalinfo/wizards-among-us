import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InertOutside } from "../InertOutside";

// A page inside a layout: the layout's header and sidebar, the page's own
// content (already inert, as the page marks it), and the dialog.
function Layout({ open }: { open: boolean }) {
  return (
    <div>
      <header>Шапка</header>
      <div>
        <nav>Бічна панель</nav>
        <main>
          <div inert>Список</div>
          {open ? (
            <div data-confirm-overlay>
              <InertOutside />
              <div role="dialog" aria-label="Видалити чернетку?" tabIndex={-1}>
                <button type="button">Видалити</button>
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}

describe("InertOutside", () => {
  it("makes everything outside the dialog inert, and leaves the dialog alone", () => {
    render(<Layout open />);

    expect(screen.getByText("Шапка")).toHaveAttribute("inert");
    expect(screen.getByText("Бічна панель")).toHaveAttribute("inert");
    expect(screen.getByRole("dialog")).not.toHaveAttribute("inert");
    expect(screen.getByRole("dialog").closest("[inert]")).toBeNull();
  });

  // A dialog opened by a client-side navigation gets no help from autoFocus,
  // which the browser honours once per document.
  it("moves focus into the dialog", () => {
    render(<Layout open />);

    expect(screen.getByRole("dialog")).toHaveFocus();
  });

  // It undoes exactly what it did — the page's own `inert` is the page's.
  it("restores only what it changed when the dialog closes", () => {
    const { rerender } = render(<Layout open />);
    rerender(<Layout open={false} />);

    expect(screen.getByText("Шапка")).not.toHaveAttribute("inert");
    expect(screen.getByText("Бічна панель")).not.toHaveAttribute("inert");
    expect(screen.getByText("Список")).toHaveAttribute("inert");
  });
});
