## React Testing Library


### Philosophy

- ALL test failures are your responsibility, even pre-existing ones.
- Never delete a test because it's failing. Raise the issue with the developer.
- Tests MUST comprehensively cover all functionality.
- NEVER write tests that only test mocked behavior. If you find such tests, warn the developer.
- NEVER use mocks in end-to-end tests. Use real data and real APIs.
- NEVER ignore test output — logs and messages often contain critical information.
- Test output MUST be pristine. If a test intentionally triggers errors, capture and validate them.

### Mindset

- Test what the user sees and does. Not internal state, not implementation details.
- If a refactor that preserves behavior breaks your test, the test was wrong.

### Querying

Use queries in this order of preference:

1. **By role**: `getByRole('button', { name: /save/i })`. Exercises the accessibility tree.
2. **By label / placeholder / text**: `getByLabelText`, `getByPlaceholderText`, `getByText`.
3. **By test id**: `getByTestId` — last resort, for elements with no semantic handle.

Avoid `container.querySelector` and class-based selection. They couple tests to markup.

### Variants

- `getBy*` — must exist now, throws otherwise.
- `queryBy*` — may not exist; returns `null`. Use for negative assertions.
- `findBy*` — async; waits for the element. Use for anything that appears after a state update or network response.

### Interactions

- Use `@testing-library/user-event` (not `fireEvent`) for user actions. It models real event sequences (focus, keypress, blur).
- `await user.click(...)`, `await user.type(...)`, `await user.selectOptions(...)`.
- `fireEvent` is acceptable only for events `user-event` doesn't model (e.g., `scroll`).

### Async

- Prefer `findBy*` and `await waitFor(...)` over arbitrary timeouts.
- `waitFor` callbacks must contain assertions, not side effects. Keep them small.
- Never `setTimeout`-based sleeps in tests.

### Context (React)

- Wrap the rendered component with the real providers it expects (theme, auth, i18n). Don't mock the provider unless the real one has a hard external dependency.
- For a custom `createContext` provider under test, render it and assert on a consumer component rather than inspecting the context value directly.

### What not to do

- Don't shallow render. Render the whole component tree.
- Don't reach into component instances. `wrapper.instance()` has no equivalent here, and that's the point.
- Don't assert on CSS classes as a proxy for behavior. Assert on what the user perceives (text, role, disabled state, presence/absence).
- Don't test third-party components. Trust them; test your integration.

### How much to test depends on what the component does

- **Pure composer** (renders children, no own behavior — e.g. a page that lays out cards): mock all children and assert only that they render. Do **not** reach into nested functionality.
- **Interactive component** (owns state, mutations, handlers — e.g. a card with a toggle): you must exercise that behavior, so render its interactive parts (mock only the *non*-interactive children and the mutation module) and assert the interaction — the toggle commits, the modal opens, the form saves.

### Coverage expectations

- Each component spec should cover: initial render, primary user interaction(s), loading state, error state, empty state.
- For form components: validation feedback, submit success, submit failure.
- For list/table components: empty, single, many; sort/filter interactions if present.

### Feature (Capybara) coverage for new UI — don't skip it

Jest/RTL specs test components in isolation; they do **not** prove the page renders and works end to end (real route, controller authorization, GraphQL, Relay). Any new user-facing page or page-level interaction also needs a Capybara `:js` feature spec under `spec/features/...`, alongside the component tests.

- Mirror the closest existing feature spec (e.g. a new `spec/features/classrooms/<thing>_pages_spec.rb` follows `edit_pages_spec.rb` / `show_pages_spec.rb`). Use `include_context 'classroom: slug equal to id'`, `login_as(user, scope: :user, run_callbacks: false)`, then `visit`.
- Cover **access control** (who is redirected vs. who sees the page) and the **primary interactions** end to end (toggle persists, form saves, the right toast appears), asserting against the reloaded record.
- After `visit`, lead with a positive matcher (`have_css('.container')` / `have_css('.classroom-header-info')`) before any negation — a negation immediately after `visit` races the page load (RuboCop `Capybara/RSpec/NegationMatcherAfterVisit` enforces this).
- When you touch a page that lacks feature coverage, add the missing case rather than only testing your slice (the classroom-header dropdown items were untested before the join code work).
- Interaction gotchas: an HC `Toggle` with no `label` prop renders a bare `<input id>` (target `find_by_id(...)`, there is no `label[for]`); a setting toggle has no success toast, so assert the visible state flip (`ACTIVE`/`INACTIVE`) or the reloaded record, not `.hc-toast`.
