# Branch Protection Guidance (Phase 1)

Apply to branch pattern: `main`

## Exact Settings

1. **Require a pull request before merging**: ON
   - Required approvals: **2**
   - Dismiss stale approvals: ON
   - Require review from Code Owners: ON
2. **Require status checks before merging**: ON
   - Require branches to be up to date: ON
   - Required checks:
     - `assurance / validate`
     - `assurance / tooling-check`
     - `assurance / run-assurance`
3. **Require conversation resolution before merging**: ON
4. **Include administrators**: ON
5. **Restrict pushes to matching branches**: ON (release maintainers only)
6. **Allow force pushes**: OFF
7. **Allow deletions**: OFF

## Release Hardening Process Checks

Enforce in release policy (pre-release / post-deploy workflows):

- `assurance / run-assurance-real`
- `promotion-gate`
- `evidence-bundle-and-sign`
