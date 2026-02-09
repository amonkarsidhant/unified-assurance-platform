# Golden Path: Multi-Module Application

This guide defines a practical delivery model for applications where teams contribute across multiple modules in one repository.

## 1) Reference application structure

Use a predictable layout so ownership, CI routing, and release gates are explicit.

```text
repo-root/
  frontend/               # UI application(s), component tests, UI smoke/e2e
  api/                    # HTTP/gRPC services, contract + integration tests
  worker/                 # async/background jobs, queue consumers, replay tests
  shared-lib/             # shared packages used by frontend/api/worker
  infra/                  # IaC, deployment manifests, env overlays

  config/modules/         # per-module assurance profiles (risk, checks, promotion)
  templates/              # onboarding + CI + assurance profile templates
  docs/golden-paths/      # human guidance
  docs/generated/         # generated module-specific golden paths
```

## 2) Developer journey (branch → PR → stage → prod)

### Step A — Create a scoped branch
- Branch naming: `feat/<module>-<short-desc>` or `fix/<module>-<short-desc>`
- Keep changes focused to one primary module plus explicitly impacted dependencies.

### Step B — Open PR with module declaration
- PR template should capture:
  - Primary module (`frontend` / `api` / `worker` / `shared-lib`)
  - Any secondary impacted modules
  - Risk statement and rollback plan
- CODEOWNERS auto-requests the right reviewers.

### Step C — PR checks (module-aware)
- CI detects changed paths and runs mandatory checks for each impacted module type.
- Required checks are branch-protected (cannot merge while failing/missing).
- If `shared-lib` changes, downstream compatibility checks for consumers are required.

### Step D — Promote to stage
- Merge to `main` triggers stage pipeline.
- Stage promotion gates include:
  - required checks pass
  - artifact provenance/signature
  - deployment smoke + critical synthetic checks
- Stage approval is recorded as release evidence.

### Step E — Promote to production
- Release train window (see section 5) promotes approved stage candidates.
- Production gate enforces stricter thresholds (no critical security issues, error budget guardrails, rollback readiness).

## 3) Module ownership model + CODEOWNERS usage

Use ownership to keep review responsibility clear.

### Ownership model
- **Primary owner team**: accountable for module quality and on-call behavior.
- **Secondary reviewers**: security/platform/domain reviewers for high-risk paths.
- **Shared ownership**: for cross-cutting modules (e.g., `shared-lib`), include all consumer teams as reviewers.

### CODEOWNERS pattern

Example:

```text
/frontend/   @org/frontend-team @org/platform-owners
/api/        @org/backend-team @org/platform-owners
/worker/     @org/data-jobs-team @org/platform-owners
/shared-lib/ @org/shared-foundations @org/frontend-team @org/backend-team
/infra/      @org/platform-owners @org/security-engineering
```

Guidelines:
- Keep exactly one primary team per module.
- Add security/platform as mandatory on high-risk modules.
- Avoid broad wildcard ownership that hides accountability.

## 4) Required checks by module type

| Module type | Baseline checks | Additional mandatory checks | Typical risk tier |
|---|---|---|---|
| frontend | lint, unit, component | e2e smoke, accessibility smoke, SAST, dependency scan | medium |
| api | lint, unit, integration, contract | API backward-compat, SAST, dependency scan, DAST smoke | high |
| worker | lint, unit, integration | idempotency/replay test, queue contract check, SAST | medium-high |
| shared-lib | lint, unit | semver/change validation, consumer compatibility matrix, SAST | high |
| infra | formatting/lint, policy checks | IaC security scan, plan review, drift/rollback verification | high |

Required checks must map directly into branch protection required statuses.

## 5) Release train model + exception workflow

### Standard release train
- **Train cadence**: e.g., Tue/Thu 14:00 UTC.
- **Eligibility**:
  - merged to `main`
  - all stage gates passed
  - no open blocker defects against release candidate
- **Promotion artifact**: signed evidence bundle + release report.

### Exception workflow (out-of-train / hotfix)
Use only for urgent customer-impacting incidents or security remediation.

Required exception controls:
1. Incident or risk ticket linked in PR/release metadata.
2. Reduced but explicit gate set still passes (minimum: lint/unit/security critical checks + smoke).
3. Approvals from:
   - module owner
   - incident commander (or duty manager)
   - platform/security owner (for high-risk modules)
4. Post-release actions required:
   - retro within 2 business days
   - test gap closure ticket
   - evidence attached to release record

## 6) Operating rules for module teams

- Do not bypass required checks by reclassifying module type.
- Keep module assurance profile versioned in `config/modules/`.
- Regenerate module-specific golden path when module type/risk changes.
- Treat generated docs as onboarding contracts for new team members.
