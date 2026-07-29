## Linting

### Required: lint what you touched

**Before handing back any change, run the relevant linter on every file you modified.** Pristine output is required — no new warnings, no new offenses. This is non-negotiable; CI will fail otherwise, and a reviewer should not be the one who discovers a trailing-whitespace offense.

Quick matrix for a typical changeset:

- TJS/TJSX files (`*.tjs`, `*.tjsx`) → `yarn eslint <files>`
- SCSS files (`*.scss`) → `yarn stylelint <files>`

For mixed changesets, run all applicable linters. Only changed-file scopes are required locally — you don't need to lint the whole project before handing back, but you do need to run `--parallel` / full scope before merging large branches (see per-tool sections).

### Cross-cutting rules

- **Prefer fixing the offense over disabling the rule.**
- If you must disable, use the **narrowest scope** — inline per-line or per-block — and add a comment explaining why.
- **Don't reformat untouched code** in a file you're editing. It pollutes the diff. (See `CLAUDE.md` design principles.)
- **Don't bulk-add to todo/ignore files** (`.rubocop_todo.yml`, eslint `overrides`, etc.) to clear failures — fix them.
- **Project-wide config changes** (`.rubocop.yml`, `.eslintrc`, `.stylelintrc`, `.haml-lint.yml`) require developer discussion.

---

### ESLint (TypeScript)

#### Scoped runs

- `yarn eslint src/` — a directory
- `yarn eslint app/Foo.js` — specific files (ESLint ignores non-JS files quietly)
- `git diff --name-only --diff-filter=ACM master... | grep -E '\.(tjs|tjsx)$' | xargs yarn eslint` — changed files vs `main`

#### Auto-correct

- `yarn eslint --fix <paths>` — safe corrections (formatting, simple rewrites).
- Review the diff carefully — `--fix` can rewrite code in surprising ways, especially for `prefer-const`, `no-var`, and import ordering.
- Re-run `yarn test` for affected specs after auto-fix.

#### Disabling

- Inline: `// eslint-disable-next-line rule-name -- reason`. One rule per disable where possible.
- Never disable for a whole file unless the file genuinely is an exception (generated, vendored).

---

### Stylelint (SCSS)

#### Scoped runs

- `yarn stylelint src/*.scss` — glob scope
- `yarn stylelint app/Foo.scss` — single file
- `git diff --name-only --diff-filter=ACM master... | grep '\.scss$' | xargs yarn stylelint` — changed files vs `main`

#### Auto-correct

- `yarn stylelint --fix <paths>` — safe formatting fixes (property order, spacing, quotes).

#### Disabling

- Inline: `/* stylelint-disable-next-line rule-name */ /* reason */`.

