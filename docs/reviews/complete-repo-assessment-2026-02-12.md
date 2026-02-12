# Complete Repo Assessment — 2026-02-12

## Executive verdict
**AMBER (leaning RED for production governance claims)**  
**Confidence: 0.82**

> Evidence snapshot is immutable for this assessment and stored under `docs/reviews/evidence/2026-02-12-complete-assessment/` (not `artifacts/latest/`).

Why: The platform is structurally strong and unusually complete for a local-first assurance framework, but it currently has **false-green and false-red pathways** that can undermine trust in promotion decisions unless tightened.

---

## Current health snapshot

### 1) Architecture coherence
**Status: Good (with coherence debt).**

- Clear layered structure exists and is implemented: policy (`policies/`), execution (`scripts/run-assurance.sh`), promotion (`scripts/evaluate-promotion.py`), evidence/reporting (`scripts/generate-release-report.py`, `scripts/normalize-results-v2.py`), observability (`scripts/export-assurance-metrics.py`, `infra/local/docker-compose.yml`).
- `docs/architecture.md` aligns with real file layout and flow.
- Coherence debt: logic is spread across shell + python + Make targets, with repeated status semantics (`pass/fail/skipped`) and duplicated wrapper patterns.

### 2) Pipeline reliability
**Status: Mixed / brittle in edge conditions.**

Evidence:
- `make validate` passed (`docs/reviews/evidence/2026-02-12-complete-assessment/make-validate.log`).
- `make run-assurance` passed command-level, but with control failure inside results (`docs/reviews/evidence/2026-02-12-complete-assessment/make-run-assurance.log`, `docs/reviews/evidence/2026-02-12-complete-assessment/results.json`).
- `make promotion-check ENV=stage` failed as expected due to control failure (`docs/reviews/evidence/2026-02-12-complete-assessment/make-promotion-check-stage.log`).

Reliability concerns:
- `run_wrapper_step` swallows wrapper exit codes via `|| true` and relies only on status files (`scripts/run-assurance.sh`). Missing/malformed status can become skipped instead of hard fail.
- Many checks degrade to `skipped` in pragmatic mode; this is explicit but still creates risk of over-trusting green-ish outputs.
- CI PR comment publishing is `continue-on-error: true` (`.github/workflows/pr.yml`), so feedback can silently disappear.

### 3) Security posture
**Status: Better than average, but noisy and easy to misread.**

Evidence:
- `secret_scan` failed in run (`docs/reviews/evidence/2026-02-12-complete-assessment/secret_scan.log`).
- `gitleaks.json` findings are from generated artifact files under ignored paths (`docs/reviews/evidence/2026-02-12-complete-assessment/*.json`, `artifacts/metrics/assurance.prom`) rather than source secrets (`docs/reviews/evidence/2026-02-12-complete-assessment/gitleaks.json`).

Implications:
- Current secret scanning can produce **false-red** from generated report content.
- DAST/newman/schemathesis are often skipped unless target/service exists.
- Promotion logic does block on failed mandatory controls in stage (good), but security signal quality is noisy.

### 4) Test quality and coverage posture
**Status: Moderate baseline, low confidence for real systems.**

Evidence:
- Test inventory is small: one unit, one integration, one contract schema test, one UI smoke, one perf smoke (`tests/`).
- No evidence of coverage thresholds or mutation/property quality gates.
- Flaky policy currently has only one sampled run (`docs/reviews/evidence/2026-02-12-complete-assessment/flaky-policy.json`), so governance confidence is low despite "allowed=true".

### 5) Observability / metrics quality
**Status: Strong local signal export, semantic caveats.**

Evidence:
- Governance metrics check passed (`docs/reviews/evidence/2026-02-12-complete-assessment/make-assurance-governance-check.log`).
- Exporter includes broad governance dimensions (`scripts/export-assurance-metrics.py`).

Caveats:
- Metric fallback behavior can mask absence of source artifacts (many empty-object defaults).
- `skipped` encoded as `-1` in several gauges is fine technically, but dashboard consumers can misinterpret unless clearly documented.

### 6) Documentation truthfulness vs implementation
**Status: Mostly truthful, but optimistic by default.**

- README claims broadly match repository capabilities.
- However, practical path to “real” assurance is dependency-heavy and not default-safe for most contributors.
- Some docs explicitly recommend `|| true` for promotion-check in examples, which encourages bypass behavior for teams that cargo-cult commands.

### 7) Onboarding / adoption realism
**Status: Good scaffolding, moderate operational friction.**

- Onboarding generators are useful (`scripts/onboard-service.py`, onboarding docs/artifacts).
- Real adoption requires non-trivial local setup (docker stack, scanners, optional tools).
- Current model is realistic for platform/QE teams; less realistic for app squads without support.

---

## Command validation summary (requested commands)

| Command | Result | Evidence |
|---|---|---|
| `make validate` | **PASS** | `docs/reviews/evidence/2026-02-12-complete-assessment/make-validate.log` |
| `make run-assurance` | **PASS (command), NO-GO posture inside results** | `docs/reviews/evidence/2026-02-12-complete-assessment/make-run-assurance.log`, `docs/reviews/evidence/2026-02-12-complete-assessment/results.json` |
| `make report` | **PASS** | `docs/reviews/evidence/2026-02-12-complete-assessment/make-report.log`, `docs/reviews/evidence/2026-02-12-complete-assessment/release-report.md` |
| `make promotion-check ENV=stage` | **FAIL** | `docs/reviews/evidence/2026-02-12-complete-assessment/make-promotion-check-stage.log`, `docs/reviews/evidence/2026-02-12-complete-assessment/promotion-decision.json` |
| `make resilience-intelligence` | **PASS** | `docs/reviews/evidence/2026-02-12-complete-assessment/make-resilience-intelligence.log`, `docs/reviews/evidence/2026-02-12-complete-assessment/resilience-intelligence.json` |
| `make resilience-scorecard` | **PASS** | `docs/reviews/evidence/2026-02-12-complete-assessment/make-resilience-scorecard.log`, `docs/reviews/evidence/2026-02-12-complete-assessment/resilience-scorecard.json` |
| `make assurance-governance-check` | **PASS** (local stack reachable) | `docs/reviews/evidence/2026-02-12-complete-assessment/make-assurance-governance-check.log` |

**Primary blocker captured:** promotion failure due to mandatory control `secret_scan=fail` and policy validation false. See `docs/reviews/evidence/2026-02-12-complete-assessment/promotion-decision.json`.

---

## Top 10 repo risks (severity / impact / probability)

1. **False-red secret scan from generated artifacts** (`run-gitleaks.sh` scans repo root incl. `artifacts/`)  
   - Severity: High | Impact: High | Probability: High
2. **Wrapper exit-code swallowing (`|| true`) in orchestration** (`scripts/run-assurance.sh`)  
   - Severity: High | Impact: High | Probability: Medium
3. **Overuse of `skipped` in pragmatic mode can look healthier than reality**  
   - Severity: High | Impact: High | Probability: High
4. **Observe-only governance can be interpreted as enforced control** (resilience intelligence note in promotion matrix)  
   - Severity: Medium | Impact: High | Probability: Medium
5. **Low test depth (minimal suites, no coverage gates)**  
   - Severity: High | Impact: High | Probability: Medium
6. **Flaky policy confidence too low with sparse history** (`sampled_runs=1`)  
   - Severity: Medium | Impact: Medium | Probability: High
7. **Promotion evidence integrity depends on tier; medium-tier can bypass signature rigor**  
   - Severity: Medium | Impact: High | Probability: Medium
8. **Shell-script sprawl + duplicated wrapper logic increases maintenance bugs**  
   - Severity: Medium | Impact: Medium | Probability: High
9. **Dashboard semantics can mislead (skipped=-1; fallback-derived severities)**  
   - Severity: Medium | Impact: Medium | Probability: Medium
10. **Docs include habitual bypass examples (`|| true`) around critical checks**  
   - Severity: Medium | Impact: Medium | Probability: Medium

---

## Top 10 strengths

1. Clear policy-driven architecture with practical flow from tests → decision → evidence.
2. Strong promotion evaluator with explicit failure reasons and control matrix.
3. Good observability exporter coverage across quality, governance, chaos, onboarding.
4. Useful normalization contract (`results.v2`) for downstream integrations.
5. Evidence bundling and signing workflow exists (including skip-reason tracing).
6. Multi-tier risk controls are codified (`policies/tiers/*.json`).
7. Resilience intelligence pipeline has concrete artifact contract and correlation model.
8. Onboarding scaffolding is productive for new services.
9. Good make-target UX for common workflows.
10. Documentation breadth is strong and mostly consistent with implementation.

---

## 30-60-90 day action plan (explicit outcomes)

### Day 0–30 (stabilize trust)
- **Outcome 1:** Eliminate false-red secret-scan noise.
  - Add gitleaks allowlist/path exclusions for generated artifacts and verify with regression test.
- **Outcome 2:** Remove silent wrapper error swallowing.
  - Refactor `run-assurance.sh` so wrapper failures without valid status are hard-fail.
- **Outcome 3:** Clarify enforcement vs observation.
  - Label observe-only controls in reports/dashboards with explicit non-blocking tag.

### Day 31–60 (tighten governance)
- **Outcome 4:** Introduce minimum “real-run confidence” signal.
  - Add metric + gate: fail promotion (or conditional) when mandatory controls are skipped above threshold.
- **Outcome 5:** Raise test confidence floor.
  - Add coverage threshold + at least 2 additional integration and contract assertions per critical workflow.
- **Outcome 6:** Consolidate wrapper code pattern.
  - Move common wrapper behavior into one helper library/script.

### Day 61–90 (production hardening)
- **Outcome 7:** Enforce environment-aware policy profiles.
  - Stage/prod promotion must require signed evidence for medium+ or justify policy exception.
- **Outcome 8:** Improve resilience signal quality.
  - Require at least one non-skipped adapter signal for resilience-intelligence in high/critical.
- **Outcome 9:** CI reliability SLA.
  - Add pipeline health SLO + alerting for missing artifacts, skipped controls, comment-post failures.

---

## Immediate next 7 actions (this week)

1. **Fix gitleaks scope now**  
   - Owner: Security Eng  
   - Acceptance: `make run-assurance` no longer fails solely due to findings in `artifacts/` paths.
2. **Patch wrapper failure semantics**  
   - Owner: Platform Eng  
   - Acceptance: missing status file or wrapper crash causes hard fail + explicit reason.
3. **Add “enforcement level” field to every control in output**  
   - Owner: QE Platform  
   - Acceptance: promotion/report/dashboard shows `enforced|observe-only` for each control.
4. **Gate on minimum real-control execution ratio**  
   - Owner: Release Governance  
   - Acceptance: promotion decision includes ratio and blocks/conditions below threshold.
5. **Harden flaky policy confidence rule**  
   - Owner: QE  
   - Acceptance: if sampled runs < min_observations, decision is explicit `insufficient_data` and non-green by default.
6. **Add quick CI smoke for required tooling matrix**  
   - Owner: DevEx  
   - Acceptance: PR fails fast with actionable install hints when mandatory tools unavailable for selected mode.
7. **Clean docs that normalize bypass (`|| true`)**  
   - Owner: Docs/Developer Productivity  
   - Acceptance: docs distinguish tutorial convenience from production-safe commands.

---

## What I would stop doing now

1. Stop treating `pragmatic` green runs as release-quality evidence.
2. Stop scanning generated artifacts as if they were source secrets.
3. Stop relying on shell `|| true` in control orchestration paths.
4. Stop presenting observe-only checks in the same visual weight as enforced controls.
5. Stop using examples with `promotion-check ... || true` in production-facing docs.

---

## High-risk files / anti-patterns worth immediate review

- `scripts/run-assurance.sh` — orchestration complexity, swallowed wrapper failures, skip-heavy behavior.
- `scripts/run-gitleaks.sh` — scans whole repo and catches generated artifacts, creating false-red risk.
- `scripts/run-schemathesis.sh` — skip-driven branching highly dependent on tool/version behavior.
- `scripts/run-end-to-end-review.sh` — multiple `|| true` patterns can normalize soft-fail outputs.
- `scripts/evaluate-promotion.py` — solid overall, but includes observe-only resilience-intelligence row that can be misread as control parity.
- `.github/workflows/pr.yml` — PR comment step marked `continue-on-error`, reducing feedback reliability.

---

## Unknowns / evidence gaps (no fake certainty)

- I did **not** run `make run-assurance-real` in this review scope; real-tool hard failure profile is not re-verified in this pass.
- No external production telemetry/data retention policy review was performed; only repo-local observability artifacts were assessed.
- Team operational ownership model was inferred from config/docs, not validated via live process interviews.

---

## Raw verification pointers

- Run logs: `docs/reviews/evidence/2026-02-12-complete-assessment/*.log`
- Exit codes: `docs/reviews/evidence/2026-02-12-complete-assessment/*.exit`
- Primary decision artifacts:  
  - `docs/reviews/evidence/2026-02-12-complete-assessment/results.json`  
  - `docs/reviews/evidence/2026-02-12-complete-assessment/promotion-decision.json`  
  - `docs/reviews/evidence/2026-02-12-complete-assessment/flaky-policy.json`  
  - `docs/reviews/evidence/2026-02-12-complete-assessment/resilience-intelligence.json`  
  - `docs/reviews/evidence/2026-02-12-complete-assessment/resilience-scorecard.json`
