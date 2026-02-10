# Platform Trial Pack backlog (2 weeks)

Prioritization rule: **P0 = must ship in 2 weeks**, **P1 = should ship if P0 complete**, **P2 = next sprint candidates**.

## P0 (must)

### P0-1: 10-minute trial command path
**User story**
- As a developer evaluating UAP, I want one documented command path to run an end-to-end trial quickly, so I can assess value without deep platform knowledge.

**Definition of Done (DoD)**
- Documented path from clone to final report in <=10 minutes.
- Produces required artifacts: results, normalized results.v2, promotion decision, report.
- Includes expected output checkpoints and failure remediation links.

### P0-2: Demo environment reliability hardening
**User story**
- As a demo operator, I want deterministic startup/readiness behavior, so live demos do not fail due to race conditions.

**DoD**
- `demo-up`/`demo-site-up`/`dev-stack-up` behavior validated with readiness checks.
- Startup timeout and clear errors documented.
- Minimum two consecutive successful dry-runs on target machine profile.

### P0-3: Adapter contract (ingestion to UAP control model)
**User story**
- As a platform integrator, I want a clear adapter contract for external tool outputs, so I can map existing stack signals into UAP without rewriting core engine logic.

**DoD**
- Contract schema documented (required fields, control ID mapping, severities, status model).
- Validation path documented and exercised with sample payloads.
- Output is compatible with existing normalization/reporting workflow.

### P0-4: Bring-your-stack recipes (first set)
**User story**
- As an enterprise team, I want practical integration recipes for common CI/security/testing/observability stacks, so UAP fits my current delivery system.

**DoD**
- At least 4 concrete recipes (covering CI + security + testing + observability categories).
- Each recipe includes input source, mapping rules, and expected UAP outputs.
- No core policy script edits required per recipe.

### P0-5: Tier guardrails enforcement
**User story**
- As a security owner, I want tier-specific required controls enforced, so high-risk services cannot bypass core assurance controls.

**DoD**
- Required controls by tier are explicitly documented and testable.
- Promotion decisions show clear failures for missing tier-required controls.
- Guardrail behavior verified for at least medium and high tiers.

### P0-6: Exception lifecycle + auditability
**User story**
- As a governance reviewer, I want controlled and expiring exceptions with ownership, so temporary risk acceptance is auditable and bounded.

**DoD**
- Exception request template path documented and used in examples.
- Expiry and ownership checks demonstrated in `exceptions-audit.json`.
- Violations are reflected in promotion rationale.

### P0-7: Evidence integrity hardening
**User story**
- As an auditor, I want evidence bundle integrity checks and fail-closed behavior for high/critical risk, so release evidence is trustworthy.

**DoD**
- Evidence creation + checksum/signature process documented with sample commands.
- Promotion behavior for missing/invalid integrity evidence documented and tested.
- High/critical fail-closed semantics validated with example run.

### P0-8: Exec demo narrative + KPI hooks
**User story**
- As an exec stakeholder, I want a short, credible demo with measurable outcomes, so I can decide pilot investment.

**DoD**
- 12-minute demo script with run commands and talking points.
- KPI definitions and collection method documented for adoption/MTTR/pass-rate/onboarding-time.
- Demo artifacts reproducible from repo instructions.

## P1 (should)

### P1-1: Starter adapter templates
**User story**
- As an integration engineer, I want starter templates for new adapters, so extension effort is low.

**DoD**
- Template(s) with placeholders for parser/mapping/validation.
- Example extension walkthrough in architecture doc.

### P1-2: Trial telemetry quality checks
**User story**
- As a platform owner, I want checks for missing/stale KPI metrics, so demo and pilot reporting remain trustworthy.

**DoD**
- Validation for required trial KPIs before demo signoff.
- Documented troubleshooting when metrics are absent.

### P1-3: Policy UX improvements
**User story**
- As a developer, I want actionable reasons for blocked promotions, so I can recover quickly.

**DoD**
- Failure explanation outputs tied to control owners/remediation map.
- At least 3 high-frequency failure categories improved.

## P2 (next)

### P2-1: Additional CI providers and hosted runners
**User story**
- As an enterprise with mixed CI, I want more provider-specific recipes.

**DoD**
- Additional provider mappings published and smoke-tested.

### P2-2: Cross-repo trial orchestration
**User story**
- As a platform team, I want centralized multi-service trial management.

**DoD**
- Orchestration concept and pilot implementation plan.

### P2-3: Advanced exception analytics
**User story**
- As governance leadership, I want trends on exception debt and abuse patterns.

**DoD**
- Trend reports and threshold-based alerts defined.
