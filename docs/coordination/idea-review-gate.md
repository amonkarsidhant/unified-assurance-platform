# Idea Review Gate (Authority Model)

This defines how ideas move from proposal to implementation in UAP.

## Stages

1. **Idea Submitted**
   - Label: `status:idea-submitted`
   - Source: human or agent issue proposal
2. **Authority Review**
   - Label: `status:authority-review`
   - Authority evaluates value/risk/fit
3. **Approved for Sprint**
   - Label: `status:approved-for-sprint`
   - Assigned to milestone + owner
4. **Implementation**
   - Label: `status:in-progress`
   - Work is active in PR(s)
5. **Closed**
   - Label: `status:done` (optional) and issue closed

## Authority Council

Minimum sign-off set:
- PO/PM (business value + sequencing)
- Platform Architect (architecture fit + guardrails)
- SRE + QA (operational and quality safety)
- Human owner (Sid) final approval for merge/release

## Decision Outcomes

- **APPROVED** → move to `status:approved-for-sprint`
- **APPROVED_WITH_CONDITIONS** → list conditions, then move when met
- **REJECTED** → close with rationale
- **DEFERRED** → move to backlog with revisit date

## Required sections for idea proposals

- Problem statement
- Proposed solution
- Value / impact
- Risks
- Evidence required
- Acceptance criteria
- Scope in / out

## Rules

- No sprint commitment without authority decision recorded in comments.
- All exceptions must include owner + expiry + rationale.
- Merge still requires explicit human approval.
