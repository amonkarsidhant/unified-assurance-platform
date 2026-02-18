# DevEx PR-B Phase-2: First-Failure Guidance & Metrics Baseline

**Source:** Issue #45  
**Parent:** PR #40 (Phase 1)

---

## Objective

Improve first-failure guidance and measurable DX outcomes.

---

## Deliverables

### 1. Failure-Summary UX Improvements

**Current State:** `docs/devex/failure-summary-contract.md` defines the contract.

**Proposed Enhancements:**
- Add `severity` field: `P0` | `P1` | `P2` | `P3`
- Add `blocked_by` field for dependency tracking
- Add `first_occurrence` flag to distinguish new vs recurring failures

**File:** Update `docs/devex/failure-summary-contract.md`

### 2. Baseline Metrics Capture

**Current State:**
- `docs/devex/metrics-baseline.md` defines the schema
- `docs/devex/ttfg-baseline.md` has Sprint-01 baseline

**Proposed:**
- Run `make devex-baseline` or equivalent to capture current metrics
- Update `docs/devex/metrics-baseline.md` with actual p50/p90 values
- Document the methodology for capturing metrics

**File:** Update `docs/devex/metrics-baseline.md`

### 3. Low-Risk Implementation Order

| Step | Task | Risk | Owner |
|------|------|------|-------|
| 1 | Update failure-summary contract with new fields | Low | DevEx |
| 2 | Capture current baseline metrics | Low | DevEx |
| 3 | Document improvement backlog | Low | DevEx |
| 4 | Validate changes with `make first-green` | Low | DevEx |

---

## Definition of Done

- [ ] Failure-summary contract enhanced with `severity`, `blocked_by`, `first_occurrence`
- [ ] Metrics baseline captured and documented (actual p50/p90 values)
- [ ] Implementation order documented
- [ ] Validation: `make first-green` passes local
