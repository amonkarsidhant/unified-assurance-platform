# Demo Walkthrough (Stakeholder-Friendly)

Use this script for a short live walkthrough.

## Goal
Show that UAP gives a clear release recommendation from evidence, even for non-QE audiences.

## Step-by-step
1. Run `make validate`
2. Run `make demo-happy`
3. Open `artifacts/latest/demo-happy-report.md`
4. Highlight:
   - Recommendation is **GO**
   - Plain-language summary explains why
5. Run `make demo-broken`
6. Open `artifacts/latest/demo-broken-report.md`
7. Highlight:
   - Recommendation is **NO-GO**
   - Mandatory gate failures are explicit

## Capability snapshot

![Assurance run and report (placeholder)](../assets/screenshots/assurance-run-report-placeholder.svg)
*Assurance run/report screenshot placeholder. Reliable capture is tracked in issue [#22](https://github.com/amonkarsidhant/unified-assurance-platform/issues/22).*

## Expected outputs
- Happy path recommendation: `GO`
- Broken path recommendation: `NO-GO`
- Report includes:
  - Gate-by-gate status
  - Plain-language stakeholder summary
  - Clear next action guidance
