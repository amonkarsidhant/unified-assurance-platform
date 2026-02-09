# Enterprise Hardening Backlog

Prioritized backlog for making this platform safer and more production-ready in enterprise settings.

## P0 (Do now)

### P0-1: Enforce risk-tier required controls in assurance execution
**Why**: risk policy must be executable, not just documented.

**Acceptance criteria**
- `scripts/run-assurance.sh` computes risk tier/score context.
- Output includes required controls and whether each is met.
- Output includes `risk_context.policy_validation_passed` and missing controls list.

### P0-2: Include risk context in release report
**Why**: governance reviewers need clear risk-based rationale.

**Acceptance criteria**
- `make report` output contains a dedicated risk context section.
- Section shows risk tier, score, required controls, missing controls, and policy status.
- Existing gate decision section remains intact.

### P0-3: Contribution standard with self-reflection requirement
**Why**: major design/report decisions need transparent trade-off thinking.

**Acceptance criteria**
- `docs/contribution-standard.md` exists with mandatory reflection guidance.
- `templates/self-reflection-template.md` exists and is referenced.
- README links to the standard/template.

## P1 (Next)

### P1-1: Add policy-file schema validation
**Why**: reduce config drift and malformed policy risk.

**Acceptance criteria**
- CI/local validation fails on malformed `policies/*.yaml`.
- Error output identifies exact file and failing rule.

### P1-2: Exception registry with expiry
**Why**: prevent indefinite conditional releases.

**Acceptance criteria**
- Exception file format includes owner, justification, expiry.
- Report surfaces active exceptions and expiry status.
- Expired exceptions fail validation.

### P1-3: Control ownership mapping
**Why**: improve operational follow-through after conditional/no-go outcomes.

**Acceptance criteria**
- Report maps failed gates/controls to owner role/team.
- Includes minimum remediation target date field.

## P2 (Later)

### P2-1: Risk trend analytics
**Why**: detect deterioration before hard failures.

**Acceptance criteria**
- Historical runs can be summarized into trend indicators.
- Report includes trend delta for key risk signals.

### P2-2: Profile-based policy overlays
**Why**: reduce over/under-testing across varied service types.

**Acceptance criteria**
- Optional profile (e.g., payments, internal tool) can tune thresholds.
- Base policy remains default and backward compatible.

### P2-3: Controlled automation for remediation suggestions
**Why**: speed response while retaining governance oversight.

**Acceptance criteria**
- Report includes deterministic remediation suggestions tied to failed controls.
- Suggestions are advisory only unless explicitly approved.
