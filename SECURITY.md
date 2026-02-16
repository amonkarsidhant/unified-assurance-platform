# Security Policy

## Supported scope

This repository is intended for assurance workflows, policy evaluation, and release evidence generation.

Security expectations apply to:
- CI/CD workflows and automation scripts
- Policy and risk model definitions
- Control-plane contracts and decision artifacts
- Documentation that affects operator security posture

## Reporting a vulnerability

Please report vulnerabilities **privately**.

Preferred paths:
1. GitHub Security Advisory for this repo: `Security` → `Advisories` → `Report a vulnerability`
2. If advisory tooling is unavailable, open a private maintainer contact request and reference this policy

Please include:
- Affected component/file path
- Reproduction steps or proof-of-concept
- Impact assessment (confidentiality/integrity/availability)
- Suggested remediation (if known)

### Response targets

- Initial triage acknowledgement: within **3 business days**
- Confirmed issue remediation plan: within **10 business days**
- Coordinated disclosure timing: agreed with reporter after fix validation

## Secrets handling policy

- **Never commit secrets** (tokens, passwords, private keys, production endpoints with credentials)
- Use local environment variables or secret managers; do not hardcode credentials in scripts/docs/examples
- Keep example/config artifacts sanitized
- Rotate any accidentally exposed secret immediately and treat as compromised
- Use repository secret scanning and pre-merge checks where available

If a secret leak is suspected:
1. Revoke/rotate secret immediately
2. Remove exposed data from current code state
3. Report incident through private channels
4. Document post-incident preventive controls

## Threat assumptions and boundaries

### Assumptions

- CI runners and contributor machines may be partially trusted but not fully hardened
- Third-party scanners/tools can fail or return incomplete results
- Promotion decisions must remain auditable and reproducible from stored evidence

### Out of scope

- Security guarantees for external tools/services beyond this repository
- Runtime hardening of environments not controlled by this project
- Organizational incident response processes outside repository maintainers

### In-scope security goals

- Prevent silent policy bypass in gate-critical paths
- Preserve integrity of decision evidence and generated reports
- Maintain least-privilege defaults in workflow/script guidance

## Related guidance

- [README.md](README.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [docs/reference/security-posture.md](docs/reference/security-posture.md)
- [docs/guides/branch-protection-guidance.md](docs/guides/branch-protection-guidance.md)
- [docs/architecture/control-plane-hardening.md](docs/architecture/control-plane-hardening.md)
