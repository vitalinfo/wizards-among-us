## React & Next.js (App Router)

Stack: **Next.js 16 App Router + React 19 + TypeScript (strict) + Tailwind v4 + next-intl**. This file is forward-looking guidance for the parent/volunteer/admin UIs built in Phases 2–7; the Phase 0 landing page is the reference example.

### Server vs Client Components (the decision you make first)

- **Server Components are the default.** A file with no `"use client"` runs on the server: it can read the DB, call server code, and never ships its JS to the browser. Keep pages, layouts, and data-loading components server-side.
- **Add `"use client"` only when the component needs browser-only features:** state (`useState`/`useReducer`), effects, event handlers, refs, browser APIs, or a client hook like next-intl's `useTranslations` in an interactive tree. Push `"use client"` **as far down the tree as possible** — a client leaf (a toggle, a form field) inside an otherwise server-rendered page, not the whole page.
- **Never fetch data in a client component with `useEffect` when a server component can load it directly.** Data loading belongs server-side (Server Component or Server Action); the client component receives it as props.
- **Authorization is server-only.** `getSessionActor()` / `requireAdmin()` (Phase 1/3) run on the server. A client-side check is UX, never a security boundary — see CLAUDE.md invariants. Child-sensitive fields must never be sent to a client that isn't entitled to them (don't pass `delivery_information` into a browse-card component).

### Components

- One component per file; the component name matches the file (`ApplicationCard` in `application-card.tsx`). File names are kebab-case, component names PascalCase.
- Functional components only. Keep them small and focused — a 140-line component holding a whole screen is a smell; split it.
- **Decompose aggressively.** A page is a thin composer; a card is a header + body; a body is small presentational pieces. Co-locate a component's helpers next to it; promote to `src/components/` (shared) only when reused.
- **Reuse before you hand-roll.** Before writing a modal, dialog, toggle, or input, check `src/components/` for an existing one. We have no component library yet; when a second use appears, extract a shared component rather than copy-paste.
- Wrap route segments in an `error.tsx` (error boundary) and `loading.tsx` where a segment does real async work.

### i18n — no hardcoded user-facing strings

- All copy lives in `messages/uk.json` and is read via next-intl. Server components/pages: `getTranslations`. Client components: `useTranslations`. SEO metadata: `generateMetadata` + `getTranslations` (see `src/app/layout.tsx`).
- Never inline a Ukrainian (or English) string in JSX. Add a key to `messages/uk.json` and reference it.

### Validation — shared zod, server-authoritative (Phase 1+)

- Define zod schemas once and reuse on client (inline feedback) and server (the real gate). The server always re-validates; client validation is a convenience, never trusted.

### Styling (Tailwind v4)

- Style with Tailwind utility classes. Prettier (with `prettier-plugin-tailwindcss`) sorts them — don't hand-order.
- Mobile-first: write base (small-screen) utilities, layer `sm:` / `md:` / `lg:` on top. The product is used heavily on phones.
- Drive responsive **layout** with CSS/utilities, not by branching on a JS `isMobile`. Reserve JS breakpoint logic for genuine behavior differences.
- Prefer theme tokens/CSS variables (`bg-background`, `text-foreground`, defined in `globals.css`) over one-off hex values. Add a token when a color recurs.
- Semantic HTML first (`<button>`, `<a>`, `<label htmlFor>`, `<ul>/<li>`, `<table>`) — see [`accessibility.md`](accessibility.md). Reach for ARIA only when semantics are insufficient.

### Hooks

- Follow the rules of hooks; ESLint enforces them — heed the warnings, don't disable.
- `useEffect` dependency arrays must be honest. If the linter complains, restructure rather than silence it. Most `useEffect` data-fetching is a smell in App Router — prefer server loading.
- Extract reusable stateful logic into `useThing` custom hooks.

### Lists & performance

- Lists need stable `key` props tied to identity (a row id) — never the array index when items can reorder.
- `React.memo` / `useMemo` / `useCallback` are not free. Add them when profiling shows a real re-render/effect problem, not as decoration.

### Dead code

- Remove unused imports, props, and components as you touch files. ESLint flags many; keep the diff clean.

### Testing

- Every component that owns behavior ships a co-located `*.test.tsx`. Conventions: [`testing.md`](testing.md). Accessibility expectations: [`accessibility.md`](accessibility.md).
