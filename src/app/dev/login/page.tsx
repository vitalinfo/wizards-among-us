import { notFound } from "next/navigation";

import { isDevLoginEnabled } from "@/lib/auth/devLogin";

import { devLogin } from "./actions";

// Session-dependent side effects → never cache. Inherits the root noindex.
export const dynamic = "force-dynamic";

// Intentionally NOT localized: this is a developer tool gated out of production,
// not product UI, so it stays out of messages/uk.json.
const OPTIONS = [
  { key: "parent", label: "Sign in as parent" },
  { key: "volunteer", label: "Sign in as volunteer" },
  { key: "both", label: "Sign in as parent + volunteer" },
] as const;

export default async function DevLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // 404 when the gate is off — the route looks like it doesn't exist. Checked
  // before anything else is read.
  if (!isDevLoginEnabled()) {
    notFound();
  }
  const { next } = await searchParams;

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-5 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Dev login</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Local-only shortcut that bypasses the Telegram widget. Creates a
          deterministic test user for the chosen role and starts a session.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {OPTIONS.map((option) => (
          <form key={option.key} action={devLogin.bind(null, option.key, next)}>
            <button
              type="submit"
              className="border-border hover:bg-surface-muted focus-visible:outline-ring w-full rounded-md border px-4 py-3 text-left text-[15px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {option.label}
            </button>
          </form>
        ))}
      </div>
    </main>
  );
}
