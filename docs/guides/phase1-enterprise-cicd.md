# Phase 1 Enterprise CI/CD Setup (GitHub Actions)

This repository now includes a production-ready CI/CD backbone with promotion gates and immutable evidence bundles.

## 1) Workflows added

- `.github/workflows/pr.yml` → PR validation on `main`
- `.github/workflows/pre-release.yml` → pre-release checks on `v*` tags + manual dispatch
- `.github/workflows/post-deploy.yml` → post-deploy verification on deployment success + manual dispatch
- `.github/workflows/reusable-assurance.yml` → reusable jobs (`validate`, `tooling-check`, `run-assurance`, `run-assurance-real`, report + artifact upload)

## 2) Required status checks (exact names)

Configure branch protection to require these checks on `main`:

- `assurance / validate`
- `assurance / tooling-check`
- `assurance / run-assurance`

For release/prod readiness policy, enforce in process that these jobs also pass in pre-release/post-deploy:

- `assurance / run-assurance-real`
- `promotion-gate`
- `evidence-bundle-and-sign`

## 3) Branch protection checklist (`main`)

In **GitHub → Settings → Branches → Add branch protection rule** for `main`:

- [x] Require a pull request before merging
- [x] Require approvals: **2**
- [x] Dismiss stale pull request approvals when new commits are pushed
- [x] Require review from Code Owners
- [x] Require status checks to pass before merging
  - [x] Require branches to be up to date before merging
  - [x] Select required checks listed above
- [x] Require conversation resolution before merging
- [x] Include administrators
- [x] Restrict who can push to matching branches (recommended: release maintainers only)
- [x] Do not allow force pushes
- [x] Do not allow deletions

## 4) CODEOWNERS + required approvals

`/.github/CODEOWNERS` has been added. Replace placeholder teams with your real org teams:

- `@your-org/platform-owners`
- `@your-org/security-engineering`

Recommended repository settings:

- Enable **Code review assignment from CODEOWNERS**
- Keep minimum required approvals at **2**
- Require at least one approval from a security owner when `/policies` or `/.github` changes

## 5) Environment promotion gates

Policies are in `config/promotion/`:

- `dev.json`
- `stage.json`
- `prod.json`

Evaluation script:

```bash
python3 scripts/evaluate-promotion.py --environment stage --results artifacts/latest/results.json
```

Gate logic verifies:

- minimum pass rate
- no critical test failures
- required result statuses per environment
- risk policy validation (stage/prod)
- required evidence files
- signed bundle evidence for prod (`*.sig` or explicit `*.sig.skip.txt` reason)

## 6) Immutable evidence + signing

Create deterministic bundle:

```bash
python3 scripts/create-evidence-bundle.py --source artifacts/latest --out-dir evidence/bundles
```

Attempt signing:

```bash
scripts/sign-evidence-bundle.sh evidence/bundles/evidence-bundle-<timestamp>.tar.gz
```

Behavior:

- If `cosign` is available, keyless signing is attempted.
- If unavailable/fails, a skip reason is written to `*.sig.skip.txt` (explicit, auditable fallback).

## 7) GitHub environment setup (recommended)

Create environments: `dev`, `stage`, `prod` in **Settings → Environments** and configure:

- Required reviewers:
  - `stage`: 1 reviewer
  - `prod`: 2 reviewers (include security/platform owner)
- Wait timer for `prod` (e.g., 10 minutes)
- Deployment branch policies:
  - `prod`: only protected branches and release tags (`v*`)

## 8) Secrets/permissions

- `GITHUB_TOKEN` default read-only permissions are used except where OIDC is required for cosign (`id-token: write`).
- If you use private registries/signing infra, add required secrets at repo or environment scope.
