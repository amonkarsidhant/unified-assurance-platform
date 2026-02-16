# Contributing to Unified Assurance Platform

Thanks for contributing. Keep changes small, testable, and auditable.

## Pull request standards

Every PR should:
- Have a clear problem statement and expected outcome
- Be scoped to one change theme (avoid unrelated edits)
- Include updated docs/runbooks when behavior or operator workflow changes
- Include evidence of validation (command output, artifact paths, or screenshots where useful)
- Be mergeable: passing CI, no unresolved review threads, no policy bypass without documented approval

### Required PR description content

Use the PR template and include:
- **Summary**: what changed and why
- **Risk**: low/medium/high with rationale
- **Validation**: exact commands run locally/CI
- **Rollback**: how to revert safely
- **Follow-ups**: deferred work tracked explicitly

## Commit style convention

Use Conventional Commits:

- `feat:` new capability
- `fix:` bug fix
- `docs:` documentation-only change
- `refactor:` code change without behavior change
- `test:` test updates
- `chore:` maintenance/tooling

Examples:
- `docs: add DX quickstart and readiness checklist`
- `fix: enforce exception expiry in promotion gate`

Guidelines:
- Keep subject line imperative and under ~72 chars
- Reference issue/PR IDs in body when relevant
- Prefer multiple focused commits over one mixed commit

## Review checklist

Before requesting review:
- [ ] Branch is up to date with `main`
- [ ] `make validate` passes
- [ ] Scope is limited and free of unrelated file churn
- [ ] Security-sensitive changes are called out explicitly
- [ ] Policy/controls impact is described (if any)
- [ ] Docs are updated for operator/developer impact
- [ ] PR template is fully completed

Reviewer checks:
- [ ] Change matches stated scope and acceptance criteria
- [ ] CI evidence is sufficient and reproducible
- [ ] Failure modes and rollback path are clear
- [ ] Ownership/reviewers are appropriate (see `CODEOWNERS`)

## Security and disclosure

Do not open public issues for vulnerabilities or leaked secrets.
Follow [SECURITY.md](SECURITY.md) for private reporting and response process.
