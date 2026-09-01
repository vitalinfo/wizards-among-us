## Accessibility

The product is used on phones by stressed people and must be usable with a keyboard and a screen reader (plan §12, Appendix A.3). Accessibility is a requirement, not polish. This guidance applies from Phase 2 onward.

### Core principles

1. Prefer **semantic HTML** over ARIA.
2. Prefer **native browser behavior** over custom keyboard handlers.
3. Add ARIA only when semantics alone are insufficient.
4. Preserve visible UX while improving keyboard and screen-reader support.
5. Any interactive component you build gets accessibility coverage in its test.

Do not patch bad markup with ARIA if the structure can be made semantic instead. Prefer `<button>` over `<div role="button">`, `<a>` for navigation, `<label htmlFor>` over click wrappers, `<table>` for tabular data, and `<ul>/<li>` for record collections.

### Forms (the parent application form is the highest-stakes surface)

- Every input has an accessible label — a visible `<label htmlFor>` linked to the input `id`. Placeholder text is not a label.
- Associate helper/error text with `aria-describedby`; set `aria-invalid={true}` on an invalid field.
- Use native `required`, `type`, `min`/`max`, `autoComplete` where applicable — the browser gives you validation and better mobile keyboards for free.
- Group related fields with `<fieldset>` + `<legend>` (e.g. a multi-step section).
- On submit failure, move focus to the first error (or a summary) so a screen-reader/keyboard user isn't stranded.

### Keyboard & focus

- Anything clickable must be operable with the keyboard through native semantics first. Avoid `<div onClick>` with hand-rolled `onKeyDown`.
- Use `:focus-visible` for focus styling. Never remove a focus outline without an equally visible replacement.
- Do not introduce positive `tabIndex`.
- For dialogs/drawers: focus enters on open, is trapped while open, and returns to the trigger on close; the dialog has an accessible name.

### Names, state, and decorative content

- Every icon-only button has a descriptive `aria-label` that names the **action** ("Зателефонувати волонтеру"), not the icon ("phone").
- Expose state: `aria-expanded` for show/hide, `aria-pressed` for on/off.
- Hide decorative icons/images from assistive tech (`aria-hidden="true"`, or `alt=""` on decorative `<img>`). Don't let an icon duplicate adjacent visible text in the screen-reader output.

### Structure

- Logical heading hierarchy (one `<h1>` per page, then `<h2>`/`<h3>` in order — don't skip levels for styling).
- Status badges (submitted / approved / claimed / …) must convey meaning by text, not color alone.

### Colour contrast

- Meet WCAG AA: **4.5:1** for normal text, **3:1** for large text (≥24px, or ≥18.66px bold). Verify any new color against every background it appears on. Decorative elements and disabled controls are exempt.

### Testing

- Assert against the **accessibility tree**: prefer `getByRole('button', { name: /…/ })`, `getByLabelText`, `getByRole('heading', …)` over `getByTestId` or class selectors (this is already the house style — see [`testing.md`](testing.md)). Role/label queries fail when the semantics are wrong, so they double as a11y checks.
- For interactive components, cover keyboard operation with `@testing-library/user-event` (tab/enter/space), and assert `aria-*` state where relevant.
- **Automated pass: wired.** Use the shared helper — `import { axe } from "@/test/axe"` then
  `expect(await axe(container)).toHaveNoViolations()`. Add a sweep to any component spec you touch.
  Two rules are off and you should know why:
  - `region` — a page-level landmark rule that fires on component fragments rendered without a `<main>`.
  - `color-contrast` — **cannot run in jsdom** (axe measures rendered pixels via canvas). Left on it
    throws per check and reports nothing, which is worse than absent. Contrast is enforced instead by
    `src/test/__tests__/contrast.test.ts`, which computes WCAG ratios from the tokens in `globals.css` —
    so a token change that breaks contrast fails CI. **Add new colour pairs to that list.**
- Axe catches the decay (a lost label, a stale `aria-*`, a duplicated id), not the judgement — it cannot
  tell you whether a label makes sense or whether focus lands somewhere useful. Keep the role/label
  assertions; the sweep is in addition to them, not instead.

### Checklist (before handing back UI)

- [ ] Native semantic element used before any ARIA
- [ ] Every input has a linked visible label; errors associated + `aria-invalid`
- [ ] Icon-only buttons have descriptive `aria-label`
- [ ] Toggles/expanders expose `aria-pressed` / `aria-expanded`
- [ ] Decorative icons/images hidden from assistive tech
- [ ] Keyboard operable; focus visible; focus managed in dialogs
- [ ] Logical heading order; status conveyed by text not color alone
- [ ] New colors meet WCAG AA contrast
- [ ] Role/label-based test coverage for the component
