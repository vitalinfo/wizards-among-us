## Testing — Vitest + React Testing Library

Stack: **Vitest** (jsdom) + **@testing-library/react** + **@testing-library/user-event** + **@testing-library/jest-dom**. Config: `vitest.config.ts`; setup: `vitest.setup.ts`. Run with `pnpm test` (CI) or `pnpm test:watch`.

Specs live next to the code as `*.test.ts` / `*.test.tsx` under `src/`.

### Philosophy

- ALL test failures are your responsibility, even pre-existing ones.
- Never delete a test because it's failing. Raise the issue with the developer.
- Tests MUST cover the functionality you add or change.
- NEVER write tests that only assert mocked behavior. If you find such tests, warn the developer.
- NEVER ignore test output — logs and messages often contain critical information.
- Test output MUST be pristine. If a test intentionally triggers errors, capture and validate them.

### Mindset

- Test what the user sees and does. Not internal state, not implementation details.
- If a refactor that preserves behavior breaks your test, the test was wrong.

### Querying

Prefer, in order:

1. **By role**: `getByRole('button', { name: /надіслати/i })`. Exercises the accessibility tree.
2. **By label / placeholder / text**: `getByLabelText`, `getByPlaceholderText`, `getByText`.
3. **By test id**: `getByTestId` — last resort, for elements with no semantic handle.

Avoid `container.querySelector` and class-based selection — they couple tests to markup.

- `getBy*` — must exist now, throws otherwise.
- `queryBy*` — may not exist; returns `null`. Use for negative assertions.
- `findBy*` — async; waits for the element. Use for anything that appears after a state update or network response.

### Interactions

- Use `@testing-library/user-event`, not `fireEvent` (it models real focus/keypress/blur sequences): `await user.click(...)`, `await user.type(...)`, `await user.selectOptions(...)`.
- `fireEvent` is acceptable only for events `user-event` doesn't model (e.g. `scroll`).

### Async

- Prefer `findBy*` and `await waitFor(...)` over arbitrary timeouts. Never `setTimeout`-based sleeps.
- `waitFor` callbacks contain assertions, not side effects. Keep them small.

### Providers & i18n

- UI copy is Ukrainian and comes from `messages/uk.json` via **next-intl**. Wrap components under test in the **real** provider with the **real** messages — don't hardcode strings or mock the provider:

  ```tsx
  import { NextIntlClientProvider } from "next-intl";
  import messages from "../../messages/uk.json";

  render(
    <NextIntlClientProvider locale="uk" messages={messages}>
      <Component />
    </NextIntlClientProvider>,
  );
  ```

  Assert against `messages.*` values (see `src/components/landing.test.tsx`) so copy edits don't silently break coverage.
- Wrap with the other real providers a component expects (theme, auth) rather than mocking them, unless the real one has a hard external dependency.

### Server Components, server actions, DB

- RTL renders **client** components. For a server component, extract its rendered UI into a client component and test that (as `page.tsx` → `<Landing/>` does), or assert via an integration/e2e layer.
- For code that touches Postgres, prefer testing pure logic (zod schemas, mappers, authorization predicates) directly. Don't mock the DB just to assert the mock — if a test needs the DB, use a real test database.
- Server-layer authorization (`getSessionActor()` / `requireAdmin()`, added Phase 1/3) must have direct tests for allow/deny per role — this is a security boundary.

### What not to do

- Don't shallow render. Render the whole component tree.
- Don't assert on CSS classes as a proxy for behavior. Assert on what the user perceives (text, role, disabled state, presence/absence).
- Don't test third-party components. Trust them; test your integration.

### How much to test depends on what the component does

- **Pure composer** (renders children, no own behavior): assert only that its parts render.
- **Interactive component** (owns state, mutations, handlers): exercise the behavior — the toggle commits, the modal opens, the form saves.

### Coverage expectations

- Each component spec covers: initial render, primary interaction(s), and the relevant loading / error / empty states.
- Form components: validation feedback, submit success, submit failure.
- List/table components: empty, single, many; sort/filter interactions if present.
