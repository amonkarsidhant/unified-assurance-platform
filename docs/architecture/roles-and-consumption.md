# Roles and Consumption Guide

Who reads what, and what action they should take.

## Product Manager (PM)

**Read:**
- `docs/qe-primer.md`
- Release report (`artifacts/latest/release-report.md`)

**Do:**
- Confirm business-critical flows are covered
- Decide on trade-offs for CONDITIONAL releases
- Ensure customer-impacting risk is explicitly acknowledged

## Engineering Lead

**Read:**
- `docs/architecture/methodology-map.md`
- `policies/quality-gates.yaml`, `policies/risk-model.yaml`
- Latest results JSON and release report

**Do:**
- Own technical risk acceptance and remediation plan
- Ensure CI/CD quality gates are enforced
- Drive flaky test and reliability debt reduction

## QA / QE

**Read:**
- `catalog/test-catalog.yaml`
- `docs/golden-paths/*`
- Demo scenarios (`demo/scenarios.md`)

**Do:**
- Map risks to test coverage
- Maintain test strategy and gate relevance
- Triage failing/flaky tests and improve signal quality

## SRE / Platform

**Read:**
- `observability/*`
- Release report performance/availability sections

**Do:**
- Validate SLO and resilience readiness
- Ensure telemetry and alerts support safe rollback/mitigation
- Feed incident learnings into pre-release checks

## Security

**Read:**
- Security gate metrics in results/report
- Risk model and quality gate policies

**Do:**
- Enforce vuln thresholds and exception process
- Verify critical paths include security testing
- Track recurring classes of vulnerabilities

## Executive / Stakeholder

**Read:**
- `docs/stakeholder-one-pager.md`
- Plain-language summary in release report

**Do:**
- Understand release confidence and risk posture quickly
- Approve or defer based on business risk and mitigation plan

---

## Suggested reading order for non-QE audiences

1. `docs/guides/qe-primer.md`
2. `docs/architecture/methodology-map.md`
3. `docs/architecture/roles-and-consumption.md`
4. `docs/getting-started/local-demo-walkthrough.md`
