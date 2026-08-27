import type { ReactNode } from "react";

// Shared full-page message used by the 404 and error boundaries, so every
// dead end looks like the same product rather than three different pages.
// Presentational only — callers supply the copy (already translated) and actions.
export function ErrorScreen({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: ReactNode; // action(s): retry button, link home
}) {
  return (
    <main className="bg-surface-muted flex min-h-svh items-center justify-center p-6">
      <div className="border-border bg-surface flex w-full max-w-md flex-col gap-4 rounded-lg border p-6 text-center">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-muted-foreground leading-relaxed">{body}</p>
        {children ? (
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {children}
          </div>
        ) : null}
      </div>
    </main>
  );
}
