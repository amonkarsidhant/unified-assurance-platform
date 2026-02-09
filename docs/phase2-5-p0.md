# Phase 2.5 (P0) gap closure

This document captures the P0 enterprise gap closure implementation.

## What was added

1. **Standardized results contract (`results.v2`)**
   - Schema: `schemas/results-v2.schema.json`
   - Normalizer: `scripts/normalize-results-v2.py`
   - Output (non-breaking): legacy `artifacts/latest/results.json` remains, new `artifacts/latest/results.v2.json` is added.

2. **PR feedback loop**
   - PR comment renderer: `scripts/render-pr-comment.py`
   - Workflow wiring:
     - `reusable-assurance.yml` generates `artifacts/latest/pr-comment.md`
     - `pr.yml` uploads `pr-comment-preview` artifact and attempts PR comment with `GITHUB_TOKEN` (best effort).

3. **Mandatory evidence integrity by tier**
   - `scripts/evaluate-promotion.py` enforces signature+attestation for required tiers (`high`, `critical` by default), configurable via promotion policy:
     - `signature_required_tiers`
     - `signature_fail_closed`
   - Missing integrity evidence is recorded in auditable fields (`audit_reasons`, `evidence_integrity`) and fails promotion when fail-closed.

4. **Flaky-test policy**
   - Policy: `config/flaky-policy.json`
   - Evaluator: `scripts/evaluate-flaky-policy.py`
   - Integrated into promotion decision (`flaky_policy`) and release report section.

## Verification commands

```bash
make validate
make run-assurance
make evaluate-flaky
make validate-exceptions ENV=stage
make promotion-check ENV=stage || true
make normalize-results-v2
make report RESULTS=artifacts/latest/results.json OUT=artifacts/latest/release-report.md
make render-pr-comment
```

## High/Critical signature fail-closed check (sample)

```bash
python3 scripts/evaluate-promotion.py \
  --environment stage \
  --results examples/phase2/promotion-results-high.json \
  --exceptions-dir config/exceptions \
  --flaky-result artifacts/latest/flaky-policy.json \
  --output artifacts/latest/promotion-decision.high-sample.json || true
cat artifacts/latest/promotion-decision.high-sample.json
```

Expected: failure includes `signature/attestation missing for required tier` when no valid `.sig` + `.cert` exist.

## Notes

- Backward compatibility is preserved: existing scripts still consume `results.json`.
- New files are additive and can be adopted incrementally in downstream systems.
