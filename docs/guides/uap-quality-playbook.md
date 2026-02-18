# UAP Quality Playbook (Risk-Based, Evidence-Driven)

## 1) Principles (how UAP defines quality)

1. **Risk first, test second**  
   Every change gets a risk tier before selecting test depth.
2. **Evidence over activity**  
   “Lots of tests ran” is not evidence; passing, relevant, recent, traceable checks are evidence.
3. **Fast-left + safe-right**  
   Shift-left for defect prevention, shift-right for production confidence and learning.
4. **Signal quality matters**  
   A test suite with low precision (false alarms) or low recall (missed bugs) is low trust.
5. **Flaky tests are product defects**  
   Treat flakiness as engineering debt with strict SLOs and ownership.
6. **Confidence is graded, not binary**  
   Release decisions use a confidence rubric (GO / CONDITIONAL GO / NO-GO).
7. **Incidents must improve pre-prod controls**  
   Every Sev incident yields at least one permanent control update.

---

## 2) Risk Tiers and Required Evidence Matrix

### Tier definitions
- **R0 (Trivial):** docs/text/config comments, no runtime behavior change
- **R1 (Low):** isolated non-critical behavior, easy rollback
- **R2 (Medium):** customer-facing feature or internal workflow with moderate blast radius
- **R3 (High):** auth, payments, data integrity, shared platform services, migrations
- **R4 (Critical):** security/privacy boundary, irreversible data change, high-scale reliability risk

### Required evidence by tier

| Evidence Type | R0 | R1 | R2 | R3 | R4 |
|---|---:|---:|---:|---:|---:|
| Risk assessment in PR | Optional | Required | Required | Required | Required |
| Unit tests for changed logic | Optional | Required | Required | Required | Required |
| Integration/API tests | N/A | Recommended | Required | Required | Required |
| Contract tests (producer/consumer) | N/A | Optional | Recommended | Required | Required |
| E2E critical path checks | N/A | Optional | Required (smoke) | Required | Required + negative scenarios |
| Security scans (SAST/dep) | N/A | Required | Required | Required | Required |
| Threat model/privacy review | N/A | N/A | Optional | Required (delta) | Required (full delta) |
| Performance checks | N/A | N/A | Recommended | Required | Required with SLO margin |
| Migration/rollback proof | N/A | N/A | Optional | Required | Required + rehearsal |
| Observability updates (dashboards/alerts) | N/A | Optional | Required if new surface | Required | Required |
| Canary/progressive delivery plan | N/A | Optional | Recommended | Required | Required |
| Post-deploy validation plan | N/A | Optional | Required | Required | Required |
| QA/owner sign-off | N/A | Optional | Required | Required | Required + approver pair |

### Evidence quality rules (for all non-trivial tiers)
- Evidence must be **relevant** (targets changed risk), **fresh** (from this commit/release), and **reproducible**.
- “Historic pass rate” cannot replace current risk evidence.
- Waivers must include: owner, expiry date, compensating controls, rollback trigger.

---

## 3) Flaky Test Policy (Zero-Normalization)

## Definition
A test is flaky if identical code/environment yields inconsistent outcomes.

## Targets and SLOs
- Suite flake rate target: **< 2%** (rolling 14 days)
- Critical path flake rate: **< 0.5%**
- Mean time to quarantine flaky test: **< 24h**
- Mean time to fix quarantined flaky test: **< 7 days** (R3/R4: <72h)

## Operating policy
1. **Detect**: auto-tag flaky when fail/pass oscillation exceeds threshold (e.g., 2+ non-deterministic flips in 20 runs).
2. **Contain**: quarantine immediately; do not allow quarantined checks to block merge unless mapped to R3/R4 critical risks.
3. **Own**: assign directly to test owner + code owner.
4. **Fix or remove**: no indefinite quarantine. Expired quarantine auto-escalates.
5. **Learn**: classify root cause (timing, data coupling, env instability, async race, selector brittleness, etc.) and add prevention pattern.

## Guardrails
- No “rerun until green” without flaky annotation.
- Max quarantine duration: **14 days** (exception requires QA lead approval).
- Flake debt is tracked as a release readiness signal.

---

## 4) Shift-Right Validation Standard

For R2+ changes, production validation must include:
- **Progressive rollout** (canary/ring/percentage)
- **Golden signals** monitored: latency, errors, saturation, traffic
- **Business KPIs** for affected flow (e.g., checkout success)
- **Auto rollback triggers** predefined before deploy
- **Verification window** with explicit GO/rollback checkpoint

Minimum post-deploy checks (R3/R4):
- No significant regression in SLO/error budget burn
- No spike in user-impacting alerts
- Critical user journey success within expected band

---

## 5) Quality Signal Precision/Recall Model

Treat test outcomes as a classifier over real defects:

- **Precision** = True Positive / (True Positive + False Positive)  
  (“When pipeline blocks, how often is it a real issue?”)
- **Recall** = True Positive / (True Positive + False Negative)  
  (“Of real issues, how many were caught before prod?”)

## UAP targets
- Precision (blocking checks): **>= 0.8**
- Recall (pre-prod for escaped defects): **>= 0.7**, trending upward per quarter

## How to improve
- Low precision → reduce noisy checks, deflake, better assertions, environment stability.
- Low recall → add risk-aligned tests/monitors for escaped classes; strengthen contract and negative-path coverage.

---

## 6) Release Confidence Rubric (GO / CONDITIONAL / NO-GO)

Score each dimension 0–3 (max 18):
1. **Risk clarity** (scope/blast radius understood)
2. **Evidence completeness** (tier-required proofs present)
3. **Signal health** (flake/noise acceptable)
4. **Security/compliance posture**
5. **Operational readiness** (runbooks, alerts, rollback)
6. **Shift-right plan quality**

### Decision bands
- **GO (15–18):** proceed
- **CONDITIONAL GO (11–14):** proceed only with documented constraints (slower rollout, extra monitoring, limited blast radius)
- **NO-GO (<=10):** block release until gaps resolved

Hard stop rules (override score):
- Unmitigated R4 risk
- Failed mandatory security control
- Missing rollback path for risky migration
- Critical path test instability beyond threshold

---

## 7) PR Test-Quality Rubric (for reviewers)

Rate each PR item Pass / Concern / Fail:

1. **Risk statement quality**
   - Clear tier + blast radius + rollback notes
2. **Test-to-risk traceability**
   - New/updated tests map to specific risks
3. **Test design quality**
   - Deterministic, meaningful assertions, avoids brittle timing assumptions
4. **Negative-path coverage**
   - Failure modes and edge cases covered where risk justifies
5. **Data and environment control**
   - Stable fixtures, isolated dependencies, no hidden coupling
6. **Observability impact**
   - Logs/metrics/traces/alerts updated for new failure modes
7. **Operational safety**
   - Feature flags, kill switch, rollback/retry semantics considered
8. **Evidence pack completeness**
   - Required artifacts attached for tier (screenshots/log links/test reports as needed)

### PR rubric outcome
- **Ready**: no Fails, max 1 Concern
- **Needs changes**: any Fail, or 2+ Concerns
- **Escalate**: any unresolved Concern on R3/R4

---

## 8) Suggested Metrics Dashboard (weekly)

- Escaped defect rate by risk tier
- Flake rate and quarantine aging
- Blocking-check precision (false alarm rate)
- Pre-prod recall estimate from incident back-analysis
- % releases by confidence band (GO / CONDITIONAL / NO-GO)
- Mean time to detect and rollback for failed releases

This playbook is intended to be practical: enforce minimum evidence by risk, improve trust in test signals, and make release decisions auditable.