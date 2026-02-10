# Platform Trial Pack (2-week implementation plan)

## Scope
Move UAP from a playground experience to an enterprise-usable developer product by delivering:
1. **10-minute demo/trial environment** (spin-up + end-to-end run)
2. **Bring-your-stack integration layer** (CI/security/testing/observability adapters)
3. **Golden path with guardrails** (policy tiers, exceptions, evidence integrity)

Timebox: **10 working days**.

## Goals
- A new team can run a successful end-to-end UAP trial in <=10 minutes using documented commands.
- Existing toolchains can integrate through clear adapter contracts without forking core scripts.
- Governance controls (tier policy, exception validation, evidence integrity) are easy to adopt and hard to bypass.
- Deliver an exec-friendly demo storyline showing decision quality, traceability, and operational value.

## Non-goals (for this 2-week pack)
- Full SaaS multi-tenant control plane.
- Net-new scanning engines (reuse existing: semgrep/trivy/ZAP/newman/playwright/k6).
- Organization-wide migration automation across all repos.
- Perfect zero-touch onboarding for every stack (target top 3 integration patterns only).

## Assumptions & dependencies
- Docker and local tooling baseline from `docs/required-tooling.md` remain prerequisites.
- Existing scripts stay source of truth (`scripts/run-assurance.sh`, `scripts/evaluate-promotion.py`, `scripts/validate-exceptions.py`, `scripts/create-evidence-bundle.py`).
- Current metrics pipeline (`scripts/export-assurance-metrics.py` + Prometheus/Grafana in `infra/local`) is available.
- At least one platform engineer, one DevEx engineer, and one security engineer can each allocate ~50% for 2 weeks.

## Workstreams and owners
- **Platform (Owner: Platform Eng Lead)**
  - Trial orchestration hardening, adapter contract plumbing, packaging, CI templates alignment.
- **DevEx (Owner: DevEx Lead)**
  - 10-minute path docs, starter profiles, UX of errors/remediation, demo script assets.
- **Security/Governance (Owner: Security Eng Lead)**
  - Policy-tier guardrails, exception lifecycle, evidence integrity and fail-closed semantics.

---

## Day-by-day plan (10 working days)

### Day 1 — Baseline and trial definition
- Lock scope and acceptance test matrix for the 3 deliverables.
- Define “10-minute trial success” command path (starting from clone).
- Confirm adapter targets for this sprint: GitHub Actions/Jenkins, Semgrep/Trivy/ZAP, Newman/Playwright, Prometheus/Grafana.

**Outputs**
- `docs/roadmap/platform-trial-pack-architecture.md` skeleton with component boundaries.
- Trial success checklist in backlog P0.

### Day 2 — Trial bootstrap command path
- Add/standardize a single trial path (wrapper target around existing make targets) with deterministic output locations.
- Improve preflight diagnostics for missing tools and fallback modes.

**Outputs**
- Stable command chain and failure messaging tied to `docs/troubleshooting.md`.

### Day 3 — Demo environment hardening
- Harden demo spin-up (`demo-up`, `demo-site-up`, `dev-stack-up`) to reduce flaky startup/order issues.
- Add explicit readiness checks and timeout behavior.

**Outputs**
- Reproducible local run with known-good artifacts in `artifacts/latest/`.

### Day 4 — End-to-end trial packaging
- Publish “10-minute trial” guide with exact commands and expected screenshots/artifacts.
- Add a scripted happy-path report generation for exec demo.

**Outputs**
- Trial runbook and callable demo command path.

### Day 5 — Adapter contract design + first adapters
- Define adapter contract schema for ingesting external tool outcomes into `results.v2` compatible shape.
- Implement first-party adapters for 2 CI patterns and 2 scanner patterns.

**Outputs**
- Adapter contract doc + sample adapter implementations.

### Day 6 — Bring-your-stack expansion
- Add integration recipes for testing + observability sources.
- Document minimal mapping rules to UAP control IDs and severity model.

**Outputs**
- Adapter cookbook with examples + validation checks.

### Day 7 — Golden path guardrails (policy tiers)
- Ensure tier requirements are explicit and testable for low/medium/high/critical.
- Add guardrail tests for required controls by tier in promotion checks.

**Outputs**
- Tier guardrail matrix and enforcement evidence.

### Day 8 — Exceptions + evidence integrity
- Tighten exception flow (request template usage, expiry enforcement, ownership checks).
- Validate evidence bundle integrity behavior and fail-closed conditions for high/critical.

**Outputs**
- Exception governance examples and integrity verification steps.

### Day 9 — Executive demo prep + KPI instrumentation
- Build 12-minute exec demo flow: baseline failure -> guided remediation -> governed promotion.
- Confirm KPI collection paths (adoption, MTTR, pass rates, onboarding time).

**Outputs**
- Demo script and KPI capture instructions.

### Day 10 — Hardening, validation, and handoff
- Run full validation (`make validate`) and trial dry-runs.
- Finalize docs, backlog cutline for next sprint, and handoff checklist.

**Outputs**
- Signed-off docs and “ready for pilot teams” checklist.

---

## Deliverables + explicit acceptance criteria

### Deliverable A: 10-minute demo/trial environment
**Acceptance criteria**
- From a clean clone, operator can execute documented command path and get to a release decision in <=10 minutes (excluding optional dependency installs).
- Produces at minimum: `artifacts/latest/results.json`, `artifacts/latest/results.v2.json`, `artifacts/latest/promotion-decision.json`, `artifacts/latest/demo-e2e-report.md`.
- Includes clear pass/fail checkpoints and troubleshooting references.

### Deliverable B: Bring-your-stack integration layer
**Acceptance criteria**
- Adapter contract documented with required fields, validation behavior, and sample payloads.
- At least 4 concrete integration examples (across CI/security/testing/observability) mapped to UAP controls.
- Integration path does not require editing core policy engine scripts for each new tool.

### Deliverable C: Golden path with guardrails
**Acceptance criteria**
- Tier policy behavior is explicit, testable, and reflected in promotion decisions.
- Exception lifecycle includes request format, approval ownership, expiry handling, and audit output (`exceptions-audit.json`).
- Evidence integrity requirements and fail-closed semantics for high/critical are documented and demonstrable.

---

## Risk register + mitigation

1. **Risk:** Demo path exceeds 10 minutes on typical laptop.
   - **Mitigation:** preflight checks, selective smoke defaults, warm-cache guidance, deterministic startup order.

2. **Risk:** Adapter scope balloons (too many tools/pipelines).
   - **Mitigation:** strict sprint cutline to top integration patterns; publish extension contract for later.

3. **Risk:** Guardrails create friction and reduce adoption.
   - **Mitigation:** policy tiers + exception templates + remediation guidance in generated artifacts.

4. **Risk:** Governance signals diverge between Grafana and artifacts.
   - **Mitigation:** keep artifacts as source of truth; verify exported metric mapping during Day 9 validation.

5. **Risk:** Team capacity split across platform and feature work.
   - **Mitigation:** assign explicit owners, daily scope checkpoint, defer P1/P2 backlog when P0 slips.

---

## Executive demo script (12 minutes)

1. **Context (1 min)**
   - “UAP turns fragmented quality/security data into governed GO/NO-GO decisions with evidence.”

2. **Fast trial spin-up (2 min)**
   - Run trial command path; show dashboard endpoints and generated artifacts folder.

3. **Broken path -> NO-GO (3 min)**
   - Show failed controls (security/perf/test).
   - Open `promotion-decision.json` and explain deterministic rationale.

4. **Remediation + exception governance (3 min)**
   - Show generated next steps / exception request flow.
   - Demonstrate approved/expired exception behavior in `exceptions-audit.json`.

5. **Evidence integrity + promotion (2 min)**
   - Show evidence bundle output and integrity checks.
   - Re-run and show controlled GO/CONDITIONAL outcome.

6. **Business impact close (1 min)**
   - Tie to KPIs: faster onboarding, lower MTTR, better pass-rate confidence, audit readiness.

---

## Metrics to prove enterprise value

### Adoption
- Time to first successful trial run (median minutes).
- Number of services onboarded per week.
- % of repos using standardized `results.v2` output.

### Operational quality
- Assurance pass rate by tier/environment.
- Promotion block reasons trend (top failing controls).
- False-positive exception rate and expiry compliance.

### Reliability and recovery
- MTTR from failed gate to successful rerun (median/p95).
- Reopen rate after conditional promotions.

### Developer experience
- Onboarding time from repo registration to first governed promotion.
- Preflight failure rate and top remediation categories.

### Governance confidence
- Evidence bundle integrity pass rate.
- % high/critical promotions meeting fail-closed evidence requirements.
- Control traceability coverage for mandatory tier controls.

## Exit criteria at end of week 2
- Trial path executed by at least 2 internal teams with <=10-minute median run time.
- Adapter contract used by at least 2 non-default toolchain combinations.
- Governance demo completed with reproducible artifacts and auditable exception/evidence outputs.
