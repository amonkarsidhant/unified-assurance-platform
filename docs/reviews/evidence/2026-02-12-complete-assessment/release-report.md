# Release Assurance Report

- Service: **sample-service**
- Timestamp: **2026-02-12T16:43:58Z**
- Recommendation: **NO-GO**

## Risk Context

- Risk score: **45**
- Risk tier: **medium**
- Policy validation passed: **False**
- Required controls by tier: **sast, sca, secret_scan, contract**

## Control Pass/Fail Matrix

- sast: **pass**
- sca: **pass**
- secret_scan: **fail**
- contract: **pass**

## Chaos Resilience

- Required: **False**
- Status: **pass**
- Required scenarios: **network_latency, dependency_timeout, queue_backlog**
- Executed scenarios: **none**
- Skipped scenarios: **chaos_toolkit, toxiproxy-cli, pumba, stress-ng**
- Reasons:
  - chaos toolkit not installed
  - toxiproxy-cli not installed
  - pumba not installed
  - stress-ng not installed

## Resilience Intelligence

- Status: **pass**
- Score: **1.0**
- Correlation status: **strong**
- Correlation score: **1.0**
- Correlation notes: load degradation and chaos outcomes align with resilience status
- Detailed artifact: `artifacts/latest/resilience-intelligence-report.md`

## Gate Evaluation

### Mandatory Gates
- test_pass_rate: 0.7857 (FAIL)
- critical_test_failures: 1 (FAIL)
- high_vulnerabilities: None (FAIL)
- availability_slo: None (PASS)
- p95_latency_ms: None (FAIL)

### Soft Gates
- medium_vulnerabilities: None (FAIL)
- flaky_tests: None (FAIL)
- test_coverage: None (PASS)

## Promotion & Exceptions

- Promotion passed: **False**
- Compliance trace summary: **docs/compliance/control-traceability.md**
- Exceptions used: none
- Promotion failures:
  - mandatory control failed: dast -> dast_zap=skipped
  - mandatory control failed: api_fuzz_contract -> api_fuzz_contract=skipped
  - mandatory control failed: chaos_resilience -> chaos_resilience=skipped
  - risk_context.policy_validation_passed is not true
  - signature/attestation missing for required tier

## Flaky Test Policy

- Evaluated: **True**
- Allowed: **True**
- Flaky count: **0** / max **3**

## Compliance Traceability

- Mapping file: `docs/compliance/control-traceability.md`
- Ownership file: `config/control-ownership.json`

## Developer Experience Artifacts

- Preflight summary: `artifacts/latest/preflight-summary.md`
- Failure explanations: `artifacts/latest/failure-explanations.md`
- Suggested next steps: `artifacts/latest/next-steps.md`
