# Agentic-QE Alignment Matrix (Enterprise-Adapted)

This matrix translates agentic QE ideas into practical rollout steps for this repository and enterprise teams using it.

## PACT Dimensions

### 1) Proactive
**Current status in this repo**
- Quality gates and risk model are codified (`policies/quality-gates.yaml`, `policies/risk-model.yaml`).
- Assurance run is automated via `scripts/run-assurance.sh` and produces machine-readable output.
- Release report already generates stakeholder-friendly summaries.

**Gaps**
- Risk context was not explicitly surfaced in release reports.
- No explicit prompt for pre-emptive owner follow-up when risk controls are only partially satisfied.

**Adopt now**
- Include risk context in results/report (tier, score, required controls, control coverage).
- Add a policy validation step that flags unmet controls expected for the selected risk tier.

**Adopt later**
- Trend-based risk drift detection across runs.
- Auto-generated “next best action” recommendations per failed gate.

**Skip/defer (for now)**
- Full autonomous remediation loops (too much control-plane complexity for v1).

---

### 2) Autonomous
**Current status in this repo**
- Execution pipeline is scriptable and runnable locally/CI.
- Pass/fail artifacts are generated consistently.

**Gaps**
- Workflow is deterministic but not context-adaptive beyond gate thresholds.
- Risk-to-control enforcement existed in policy but not in executable checks.

**Adopt now**
- Enforce a minimum policy check for required controls by risk tier during assurance.
- Preserve this policy evidence inside `results.json` for downstream reporting.

**Adopt later**
- Adaptive test-plan selection from service metadata.
- Automatic exceptions workflow with expiry and approver metadata.

**Skip/defer (for now)**
- Fully self-scheduling orchestration agents.

---

### 3) Collaborative
**Current status in this repo**
- Multiple stakeholder docs exist (primer, roles, architecture, roadmap).
- Reports include plain-language summary for cross-functional consumption.

**Gaps**
- No required self-reflection checkpoint in major design/report artifacts.
- Collaboration guardrails are implied, not standardized.

**Adopt now**
- Add a reusable self-reflection template.
- Define contribution standard requiring reflection block in major design docs/reports.

**Adopt later**
- PR template automation for reflection section enforcement.
- Ownership mapping for each gate/control in generated reports.

**Skip/defer (for now)**
- Complex chatops approval bots.

---

### 4) Targeted
**Current status in this repo**
- Risk model defines controls by low/medium/high tiers.
- Quality gates distinguish mandatory vs soft signals.

**Gaps**
- Reports previously focused on global gate outcomes without explicit risk-tier control coverage.
- Tier-specific control attainment not obvious to governance reviewers.

**Adopt now**
- Add explicit risk-context section to release report.
- Include missing required controls and mark whether policy validation passed.

**Adopt later**
- Domain profiles (payments vs internal tools) with tuned thresholds.
- Exception policy with risk-owner accountability and expiry.

**Skip/defer (for now)**
- Highly granular model-per-team policy forks (governance overhead too high).

---

## Enterprise Readiness Lens

### Security
- Positive: mandatory vulnerability and reliability-related gates already exist.
- Needed: explicit mapping between risk tier and expected controls in generated evidence.

### Compliance
- Positive: auditable artifacts and structured policies exist.
- Needed: explicit policy-validation output and traceability in reports.

### Governance
- Positive: GO/CONDITIONAL/NO-GO decision model is clear.
- Needed: standardized reflection + rationale sections in major docs/reports.

### Operability
- Positive: local Make targets provide low-friction execution.
- Needed: actionable context in reports (what failed, what to do next, what is deferred).

## Practical rollout suggestion
1. Ship now: risk-context + policy validation + contribution standard + reflection template.
2. Next quarter: enforce reflection and exception metadata in CI templates.
3. Later: add trend analytics and adaptive scope selection from service/risk metadata.
