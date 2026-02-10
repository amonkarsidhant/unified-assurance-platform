# Failure Explanation + Next Steps (example)

## Scenario
`make promotion-check ENV=stage` failed for a high-tier service.

## Why it failed
- Mandatory control failed: `dast -> dast_zap=fail`
- Signature required for high tier, but no `.sig` / `.cert` found in `evidence/bundles`

## What to do next
1. Re-run ZAP with aligned threshold:
   ```bash
   ZAP_FAIL_LEVEL=medium make zap-smoke
   ```
2. Re-run assurance and promotion check:
   ```bash
   make run-assurance-real
   make promotion-check ENV=stage
   ```
3. If failure is a known temporary false-positive, request a time-bound exception:
   ```bash
   make request-exception CONTROL=dast REASON='Temporary false positive; fix in progress' EXPIRY_DAYS=7
   ```
4. Create and sign evidence bundle:
   ```bash
   make evidence-bundle
   make sign-bundle
   ```
5. Re-run:
   ```bash
   make promotion-check ENV=stage
   ```
