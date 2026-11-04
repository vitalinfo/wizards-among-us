import { describe, expect, it, vi } from "vitest";

// The session is a database lookup and the request headers are request-scoped;
// what is under test is where the layout sends each kind of visitor.
const session = vi.hoisted(() => ({ actor: null as unknown }));
vi.mock("@/lib/auth/session", () => ({
  getSessionActor: async () => session.actor,
}));
const request = vi.hoisted(() => ({ path: null as string | null }));
vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers(
      request.path === null ? {} : { "x-request-path": request.path },
    ),
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));

import AccountLayout from "../layout";

function renderLayout() {
  return AccountLayout({ children: <p>cabinet</p> });
}

describe("/account layout", () => {
  // Regression (prod, 2026-11-04): a bot notification's link signed in to the
  // account's front page, because this guard hardcoded "/account".
  it("sends a signed-out deep link to sign in, keeping the page it asked for", async () => {
    session.actor = null;
    request.path = "/account/parent/applications/4a69e2b0/view";
    await expect(renderLayout()).rejects.toThrow(
      "redirect:/login?next=%2Faccount%2Fparent%2Fapplications%2F4a69e2b0%2Fview",
    );
  });

  it("falls back to the account root without the header", async () => {
    session.actor = null;
    request.path = null;
    await expect(renderLayout()).rejects.toThrow(
      "redirect:/login?next=%2Faccount",
    );
  });

  it("ignores a path outside /account", async () => {
    session.actor = null;
    request.path = "//evil.com/account";
    await expect(renderLayout()).rejects.toThrow(
      "redirect:/login?next=%2Faccount",
    );
  });

  it("sends an admin to their own panel", async () => {
    session.actor = { kind: "admin", id: "a1" };
    request.path = "/account/parent";
    await expect(renderLayout()).rejects.toThrow("redirect:/admin");
  });

  it("lets a signed-in user through", async () => {
    session.actor = { kind: "user", id: "u1", roles: ["parent"] };
    request.path = "/account/parent";
    const ui = await renderLayout();
    expect(ui).toBeTruthy();
  });
});
