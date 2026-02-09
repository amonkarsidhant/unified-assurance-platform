# Phase 2 Compliance Traceability (SOC2/ISO-style)

| Control | Intent | Evidence Artifacts |
|---|---|---|
| SAST (`sast`) | Detect code-level security defects before release | `artifacts/latest/security_scan.status`, `artifacts/latest/semgrep.json`, `artifacts/latest/security_scan.log` |
| SCA (`sca`) | Detect vulnerable dependencies | `artifacts/latest/dependency_scan.status`, `artifacts/latest/trivy.json`, `artifacts/latest/dependency_scan.log` |
| DAST (`dast`) | Detect runtime/web attack surface issues | `artifacts/latest/dast_zap.status`, `artifacts/latest/dast_zap.log` |
| Contract (`contract`) | Preserve consumer/provider compatibility | `artifacts/latest/contract.status`, `artifacts/latest/contract.log` |
| Performance Smoke (`perf_smoke`) | Prevent major regression in key path latency/error | `artifacts/latest/performance_smoke.status`, `artifacts/latest/k6-summary.json`, `artifacts/latest/performance_smoke.log` |
| Resilience (`resilience`) | Validate graceful degradation/recovery behavior | `artifacts/latest/resilience.status`, `artifacts/latest/resilience.log` |
| Exceptions governance | Ensure temporary risk acceptance is approved/auditable | `artifacts/latest/exceptions-audit.json`, `config/exceptions/*.yaml` |
| Promotion decision audit | Enforce policy decision with reason trail | `artifacts/latest/promotion-decision.json`, `artifacts/latest/release-report.md` |

## Audit Readiness Notes
- Every required control for the risk tier is mapped to a concrete artifact path.
- Exceptions are time-bound and approver-attributed; expired exceptions fail promotion.
- Promotion gate output is machine-readable and human-readable.
