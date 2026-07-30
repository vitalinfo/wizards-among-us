## Linting & formatting

Stack: **ESLint 9 (flat config) + Prettier** on TypeScript/TSX. Run with **pnpm**.

### Required: lint what you touched

**Before handing back any change, run the linter + formatter on every file you modified.** Pristine output is required — no new warnings, no new errors. CI (`.github/workflows/ci.yml`) runs `typecheck`, `lint`, `test`, and `build`; a reviewer should not be the one who discovers a lint offense.

Quick matrix for a typical changeset:

- `*.ts` / `*.tsx` → `pnpm eslint <files>` and `pnpm prettier --check <files>`
- `*.css` (Tailwind v4) → `pnpm prettier --check <files>`

For mixed changesets, run both. Changed-file scope is enough locally; run the full scope (`pnpm lint`, `pnpm format:check`) before merging a large branch.

A **pre-commit hook** (`git-hooks/pre-commit`, enabled via `core.hooksPath` on `pnpm install`) already runs Prettier `--write` + ESLint `--fix --max-warnings=0` on staged files and re-stages the fixes — so `--max-warnings=0` (no warnings, not just no errors) is the enforced bar. It doesn't replace running the linter on what you touched; the heavier gates (typecheck/test/build) run in CI.

### Cross-cutting rules

- **Prefer fixing the offense over disabling the rule.**
- If you must disable, use the **narrowest scope** — inline per-line — and add a comment explaining why.
- **Don't reformat untouched code** in a file you're editing. It pollutes the diff.
- **Don't bulk-add to ignore lists** (`eslint.config.mjs` `globalIgnores`, `.prettierignore`) to clear failures — fix them.
- **Project-wide config changes** (`eslint.config.mjs`, `.prettierrc.json`, `tsconfig.json`) require developer discussion.

---

### ESLint

Config: `eslint.config.mjs` (flat), extending `eslint-config-next` (core-web-vitals + typescript) with `eslint-config-prettier` to defer formatting to Prettier.

#### Scoped runs

- `pnpm eslint src/` — a directory
- `pnpm eslint src/components/landing.tsx` — specific files
- `git diff --name-only --diff-filter=ACM main... | grep -E '\.(ts|tsx)$' | xargs pnpm eslint` — changed files vs `main`

#### Auto-correct

- `pnpm lint:fix` (or `pnpm eslint --fix <paths>`) — safe corrections.
- Review the diff carefully — `--fix` can rewrite code in surprising ways (`prefer-const`, import ordering).
- Re-run `pnpm test` for affected specs after auto-fix.

#### Disabling

- Inline: `// eslint-disable-next-line rule-name -- reason`. One rule per disable where possible.
- Never disable for a whole file unless it genuinely is an exception (generated, vendored).

---

### Prettier

Config: `.prettierrc.json` (+ `prettier-plugin-tailwindcss`, which sorts Tailwind classes). Ignore list: `.prettierignore`.

- `pnpm format` — write formatting fixes across the repo.
- `pnpm format:check` — verify (what CI effectively expects); use `--check <files>` for a scoped check.
- Let Prettier own formatting; don't hand-format or add stylistic ESLint rules that fight it.
