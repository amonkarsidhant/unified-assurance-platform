# Security Posture

This page summarizes the current security and governance posture of the Unified Assurance Platform (UAP), including threat model scope, control coverage, evidence integrity expectations, and known gaps with concrete roadmap actions.

## Scope and intent

UAP is a release-assurance and promotion-governance system. It does not claim to eliminate all delivery risk; it provides explicit, auditable signals so teams can make and defend promotion decisions.

Use this page with:
- [Security policy](../../SECURITY.md)
- [Control traceability](../compliance/control-traceability.md)
- [Control-plane hardening](../architecture/control-plane-hardening.md)
- [Phase 2.5 promotion refinements](../guides/phase2-5-p0.md)

## Threat model

### Assets

Primary assets that require protection:
- Promotion decisions (`GO` / `CONDITIONAL` / `NO-GO`) and their rationale.
- Assurance artifacts (status files, logs, reports, policy evaluations).
- Exception approvals and expiry metadata.
- Control-plane run metadata and event history.
- Pipeline identity context (who triggered what, when, and under which policy tier).

### Trust boundaries

Key trust boundaries in the current design:
1. **Contributor code vs CI runtime**
   - Untrusted/partially trusted change input is evaluated in CI.
2. **Execution worker vs decision policy**
   - Control execution and policy evaluation are separate concerns; decisioning should not trust arbitrary process output blindly.
3. **Mutable working outputs vs immutable review evidence**
   - `artifacts/latest/` is a mutable convenience pointer.
   - Durable snapshots are stored in timestamped evidence locations.
4. **Repository controls vs external tools/services**
   - Scanners and external dependencies can fail, be unavailable, or produce incomplete findings.

### Attacker assumptions

Threat assumptions used for posture evaluation:
- A contributor or compromised automation may attempt to bypass required controls.
- A malicious or buggy step may overwrite mutable artifacts to alter apparent outcomes.
- CI runners and developer machines are not assumed fully hardened.
- External scanner outputs may be absent, degraded, or manipulated unless validated in policy.

### Representative abuse cases and mitigations

| Abuse case | Potential impact | Current mitigations | Residual risk |
| --- | --- | --- | --- |
| Control marked non-required in tier policy without review | Under-tested promotion | Policy files versioned + review workflows + branch protections | Misconfiguration risk remains if reviews are weak |
| Mutable artifact overwritten after control execution | False evidence trail | Promotion gate expects required files, supports bundle/signing flow, immutable review snapshots | `artifacts/latest/` can still be altered locally/late in pipeline |
| Exception granted without expiry/approval quality | Permanent policy bypass | Exceptions audit output + expiry enforcement in promotion checks | Shared governance quality varies by team discipline |
| Worker/API misuse or unauthorized trigger | Unauthorized run orchestration | Allowlisted commands + optional API token + audit events | No RBAC/per-user identity in current control-plane model |
| Tooling outage (SAST/SCA/DAST) treated as success | False confidence | Required controls for higher tiers, explicit status/log artifacts, fail-closed intent for strict paths | Lower-tier and non-strict paths may still allow degraded confidence |

## Control coverage matrix

Status key:
- **Implemented**: available and integrated in current workflows.
- **Partial**: present but with meaningful gaps.
- **Planned**: documented direction; not yet fully implemented.

| Control category | Current implementation status | Evidence locations |
| --- | --- | --- |
| SAST | Implemented | `artifacts/latest/security_scan.status`, `artifacts/latest/semgrep.json`, `artifacts/latest/security_scan.log` |
| SCA | Implemented | `artifacts/latest/dependency_scan.status`, `artifacts/latest/trivy.json`, `artifacts/latest/dependency_scan.log` |
| DAST | Implemented | `artifacts/latest/dast_zap.status`, `artifacts/latest/dast_zap.log` |
| Secrets scanning | Implemented | `artifacts/latest/secret_scan.log`, `artifacts/latest/gitleaks.json` |
| Contract/API compatibility | Implemented | `artifacts/latest/contract.status`, `artifacts/latest/contract.log` |
| Performance smoke | Implemented | `artifacts/latest/performance_smoke.status`, `artifacts/latest/k6-summary.json`, `artifacts/latest/performance_smoke.log` |
| Resilience and chaos | Partial | `artifacts/latest/resilience.status`, `artifacts/latest/chaos-results.json`, `artifacts/latest/resilience-intelligence.json` |
| Exceptions governance | Implemented | `artifacts/latest/exceptions-audit.json`, `config/exceptions/*.yaml` |
| Promotion policy decision audit | Implemented | `artifacts/latest/promotion-decision.json`, `artifacts/latest/release-report.md` |
| Evidence integrity (immutability + signing) | Partial | `evidence/bundles/`, `docs/reviews/evidence/<snapshot>/` (control-plane run-scoped immutable path is planned for broader governance usage) |
| Control-plane authentication/authorization | Partial | Token auth (`CONTROL_PLANE_API_TOKEN`), audit trigger events |
| Tamper-evident audit chain | Planned | Roadmap item; no cryptographic event chaining yet |

## Evidence integrity

### Why `artifacts/latest` is mutable

`artifacts/latest/` is an operational pointer optimized for local iteration and CI job ergonomics. It is intentionally mutable so each run can write current outputs to a stable path.

Implication: do **not** treat `artifacts/latest/` alone as immutable audit evidence for governance decisions.

### Immutable snapshot strategy

For review-grade and audit-grade evidence, create and preserve immutable snapshots from `artifacts/latest/`:

1. **Bundle snapshots (pipeline/archive use):**
   - Path: `evidence/bundles/`
   - Producer: `scripts/create-evidence-bundle.py --source artifacts/latest --out-dir evidence/bundles`
   - Optional signature/attestation: `scripts/sign-evidence-bundle.sh <bundle>`
2. **Repository-pinned review snapshots (human review use):**
   - Path: `docs/reviews/evidence/<snapshot-id>/`
   - Used for assessments where reviewers must verify claims without relying on ephemeral CI storage.
3. **Control-plane run-scoped outputs (execution immutability):**
   - Path: `artifacts/control-plane/runs/<run-id>/`
   - Captures run metadata, pointers, and result maps per run identifier.

### Naming/versioning guidance

Use deterministic, sortable naming:
- Timestamp-first IDs in UTC (recommended):
  - `YYYYMMDDTHHMMSSZ` for machine-oriented bundles
  - `YYYY-MM-DD-<context>` for human review snapshots
- Include context suffix when useful (`stage`, `prod`, `complete-assessment`, release tag).
- Never mutate an existing immutable snapshot directory or bundle after publication.
- If regeneration is required, create a new snapshot ID and link both with rationale.

### Auditability expectations

Minimum expectations for governance-grade auditability:
- Promotion decision references concrete evidence paths.
- Evidence set includes both machine-readable outputs (`*.json`) and human-readable summaries (`*.md`).
- Snapshot identity (timestamp/run id/tag) is explicit in review artifacts.
- Any skipped signature/attestation step is recorded with an explicit reason (`*.sig.skip.txt`), not silently ignored.

## Known limitations and roadmap actions

| Current limitation | Risk if unchanged | Roadmap action |
| --- | --- | --- |
| Shared token model for control-plane API (no RBAC / per-user identity) | Weak accountability and coarse access control | Introduce identity-aware authN/authZ (service and human principals), with scoped permissions and audit subject attribution |
| No cryptographic tamper-evident chain for run events | Harder to prove event-log integrity post-incident | Add signed event digest chain anchored to immutable snapshot metadata |
| Evidence integrity is tier-dependent in some paths | Inconsistent assurance expectations across environments | Move to stricter default evidence integrity for stage/prod, with explicit documented exceptions only |
| `artifacts/latest/` is easy to misuse as authoritative evidence | Reviewer confusion and accidental trust in mutable output | Update release process runbooks and review templates (outside this `security-posture.md`) to require immutable snapshot references in release/change reviews |
| External tool availability influences control confidence | False sense of security during scanner/tool outages | Expand fail-closed behavior for required controls in strict gate mode and improve degraded-mode signaling |
| At-rest encryption for local control-plane DB/artifacts not built-in | Increased exposure on compromised host/storage | Document encryption-at-rest patterns and provide optional hardened storage profile |

## Operating guidance for stakeholders

For stakeholder review packs and governance checkpoints:
1. Read the promotion decision from an immutable snapshot first (`docs/reviews/evidence/<snapshot-id>/promotion-decision.json` and/or `evidence/bundles/` extracted evidence); only fall back to run-scoped equivalents when immutable snapshot references are unavailable.
2. Validate control evidence against [control traceability](../compliance/control-traceability.md).
3. Confirm immutable snapshot location (`evidence/bundles/` and/or `docs/reviews/evidence/<snapshot-id>/`).
4. Record unresolved limitations as explicit risk acceptance, with owner and due date.

Procedural note for bundle-backed reviews:
- Extract the selected bundle from `evidence/bundles/` to a temporary directory (for example via `tar -xzf <bundle>.tar.gz -C <temp-dir>`).
- Verify the extracted payload contains expected governance files (`promotion-decision.json`, release report, and required control evidence files/logs).
- Validate each evidence file against [control traceability](../compliance/control-traceability.md) and confirm manifest/hash entries match before accepting the evidence set.
- Cross-check the immutable promotion decision in `docs/reviews/evidence/<snapshot-id>/promotion-decision.json` when present; use run-scoped fallback only after immutable checks are exhausted.
