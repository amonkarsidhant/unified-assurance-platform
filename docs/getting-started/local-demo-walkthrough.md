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

## Screenshot placeholders
- TODO (#17): Add screenshot asset for terminal running `make demo-happy` and replace this line with markdown image syntax.
- TODO (#17): Add screenshot asset for `demo-happy-report.md` plain-language summary and replace this line with markdown image syntax.
- TODO (#17): Add screenshot asset for terminal running `make demo-broken` and replace this line with markdown image syntax.
- TODO (#17): Add screenshot asset for `demo-broken-report.md` mandatory failures and replace this line with markdown image syntax.

## Expected outputs
- Happy path recommendation: `GO`
- Broken path recommendation: `NO-GO`
- Report includes:
  - Gate-by-gate status
  - Plain-language stakeholder summary
  - Clear next action guidance
