# Code Review: Missing Capabilities and Gaps

Date: 2026-02-10

## Scope reviewed

- Automation entrypoints: `Makefile`, `scripts/run-assurance.sh`, `scripts/tooling-check.sh`
- Test/lint surface: `package.json`, `tests/unit/`, `tests/integration/`, `tests/contract/`, `tests/ui/smoke.spec.ts`
- Documentation/operational readiness: selected `docs/` and `reporting/` artifacts

## Implementation status

### ✅ Implemented from prior recommendations

1. **Real JavaScript quality gates implemented**
   - `npm run lint` — executes `scripts/lint-js.mjs` (syntax checks + TODO/FIXME/trailing-whitespace checks).
   - `npm test` — runs real unit tests under `tests/unit/`.
   - `npm run test:integration` — runs integration tests under `tests/integration/`.
   - `npm run test:contract` — runs contract tests under `tests/contract/`.

2. **Playwright browser bootstrap added**
   - `npm run test:ui:smoke` now calls `scripts/ensure-playwright.mjs` before running Playwright tests.
   - The bootstrap script checks for Chromium and installs it automatically when missing.

3. **Tooling check reliability hardened**
   - `scripts/tooling-check.sh` continues using a pipefail-safe first-line extraction (`sed -n '1p'`).

### 🔶 Remaining gap

1. **Reporting/documentation placeholders still need production data**
   - Example: `_TBD_` trend fields and placeholder owner/risk rows in scorecard templates.
   - This requires organizational data/ownership inputs, not only code changes.

## Validation commands used during implementation

- `make validate`
- `make tooling-check`
- `npm run lint`
- `npm test`
- `npm run test:integration`
- `npm run test:contract`
- `make run-assurance`

