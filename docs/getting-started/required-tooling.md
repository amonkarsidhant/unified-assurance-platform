# Required Tooling (macOS)

Use this before first onboarding run.

## Required vs optional

| Tool | Required | Install (macOS) | Verify |
|---|---|---|---|
| git | Yes | `brew install git` | `git --version` |
| bash | Yes | preinstalled | `bash --version` |
| python3 | Yes | `brew install python` | `python3 --version` |
| make | Yes | Xcode CLT: `xcode-select --install` | `make --version` |
| node + npm | Yes (for Playwright/UI checks) | `brew install node` | `node -v && npm -v` |
| docker + docker compose | Recommended (needed for local Grafana/Prometheus + ZAP container path) | `brew install --cask docker` | `docker --version && docker compose version` |
| jq | Optional | `brew install jq` | `jq --version` |
| k6 | Optional (real perf check) | `brew install k6` | `k6 version` |
| semgrep | Optional (real SAST) | `brew install semgrep` | `semgrep --version` |
| trivy | Optional (real SCA/image scan) | `brew install trivy` | `trivy --version` |
| zaproxy (desktop) | Optional (local DAST) | `brew install --cask owasp-zap` | `zap.sh -version` |
| newman | Optional (real API smoke) | `npm install -g newman` | `newman -v` |
| playwright browsers | Optional (real UI smoke) | `npx playwright install chromium` | `npx playwright --version` |

## Minimal first-run setup

```bash
make bootstrap
make validate
npm install
npx playwright install chromium
```

## Gotchas (important)

- **Docker not running**: `make dev-stack-up`/`make assurance-governance-check` will fail if Docker Desktop is not started.
- **ZAP target from container**: if scanning host-local services from Dockerized ZAP, use `host.docker.internal` instead of `localhost`.
- **ZAP fail level mismatch**: align `ZAP_FAIL_LEVEL` with your policy expectations (`low|medium|high`).
- **Playwright deps on clean Mac**: run `npm install` first, then `npx playwright install chromium`.
- **Gatekeeper blocks ZAP**: allow in macOS Privacy & Security when launching first time.

## Fast check command

```bash
make tooling-check
```
