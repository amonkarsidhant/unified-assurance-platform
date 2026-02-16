# Methodology Map

This map shows how quality decisions move from idea to production operations.

## 1) Shift-left planning
Quality starts during discovery/design:
- Define critical user flows and failure impact
- Identify technical and business risks early
- Add acceptance criteria and testability requirements before coding

**Output:** risk notes + quality requirements for the change.

## 2) Risk-based strategy
Not all changes need the same depth of testing.

Use higher rigor when:
- Revenue, security, compliance, or customer trust is at risk
- Core journeys are touched (auth, checkout, billing, data integrity)

Use lighter rigor when:
- Cosmetic/UI-only or low-impact internal change

**Output:** right-sized test scope and release gate expectations.

## 3) Quality gates
Quality gates convert policy into objective release criteria.

Typical mandatory gates:
- No critical test failures
- No high-severity vulnerabilities
- Meets availability/performance thresholds

Typical soft gates:
- Flaky test count below threshold
- Coverage goals
- Medium vulnerability budget

**Output:** GO / CONDITIONAL / NO-GO recommendation with evidence.

## 4) CI/CD integration
Automate enforcement in delivery pipelines:
- Run fast checks on PR
- Run broader assurance on main/nightly
- Generate a release report artifact for stakeholders

**Output:** auditable, repeatable release readiness signal.

## 5) Observability feedback loop
After release, production data should improve future quality strategy:
- Incidents and near-misses become new tests or stronger gates
- SLO/SLI trends tune thresholds
- Top failure modes drive test investment

**Output:** continuous improvement instead of static process.

---

## End-to-end flow (at a glance)
1. Plan change + identify risk
2. Select right-sized test strategy
3. Execute automated checks in CI/CD
4. Evaluate against gates
5. Decide release readiness
6. Feed production learnings back into planning and test design
