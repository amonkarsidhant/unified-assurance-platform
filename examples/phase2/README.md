# Phase 2 Example Scenarios

## 1) Failing promotion without exception

```bash
python3 scripts/evaluate-promotion.py \
  --environment stage \
  --results examples/phase2/promotion-results-high.json \
  --exceptions-dir config/exceptions
```

Expected: fails on mandatory control `dast`.

## 2) Passing promotion with valid exception

```bash
python3 scripts/evaluate-promotion.py \
  --environment stage \
  --results examples/phase2/promotion-results-high.json \
  --exceptions-dir examples/phase2
```

Expected: passes by applying `EXC-PHASE2-VALID-001`.

## 3) Failing promotion with expired exception

Use only the expired exception file (copy into temp dir as the only yaml), then run:

```bash
python3 scripts/evaluate-promotion.py \
  --environment stage \
  --results examples/phase2/promotion-results-high.json \
  --exceptions-dir <dir-containing-expired-only>
```

Expected: fails with `invalid exception ... expired`.
