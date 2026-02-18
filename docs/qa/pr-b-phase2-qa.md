# QA PR-B Phase-2: Evidence Traceability + Merge Gate Matrix

**Source:** Issue #44  
**Parent:** Issue #41 (Sequencing)

---

## Objective

Enforce requirement-to-evidence traceability and risk-tiered QA gates in phase-2.

---

## Deliverables

### 1. QA Evidence Matrix Update

**Purpose:** Map requirements to test evidence for traceability.

**Proposed Structure:**

| Requirement ID | Requirement Description | Risk Tier | Test Type | Evidence Required | Owner |
|----------------|------------------------|-----------|-----------|-------------------|-------|
| REQ-001 | Governance gate passes | T0 | Automated | CI run link | DevEx |
| REQ-002 | PR template complete | T1 | Automated | PR metadata check | DevEx |
| REQ-003 | Architecture guardrails | T1 | Manual | Checklist sign-off | Architect |
| REQ-004 | Reliability criteria | T2 | Manual | Runbook link | SRE |

### 2. Minimum Merge Gate Checklist

**Required for ALL PRs:**
- [ ] CI passes (all checks)
- [ ] PR template sections completed
- [ ] No unresolved review comments
- [ ] Evidence matrix populated (if applicable)

**Risk-Based Requirements:**

| Risk Level | Additional Requirements |
|------------|------------------------|
| T0 | All automated checks pass + security scan |
| T1 | T0 + manual review sign-off |
| T2 | T0 + evidence matrix complete + test results attached |

### 3. Failure Triage Protocol Alignment

**Based on `docs/devex/failure-summary-contract.md`:**

| Failure Class | Triage Owner | SLA | First Action |
|--------------|-------------|-----|--------------|
| env | DevEx | 4h | Reproduce locally |
| policy | DevEx/Governance | 2h | Check contract docs |
| test | QA | 4h | Analyze test logs |
| flake | QA | 24h | Verify flakiness |
| infra | SRE | 1h | Check status page |
| security | Security | 1h | Escalate to security team |

---

## Definition of Done

- [ ] QA evidence matrix defined and documented
- [ ] Merge gate checklist published
- [ ] Failure triage protocol aligned with DevEx contract
- [ ] Linked to Issue #45 (DevEx metrics)
