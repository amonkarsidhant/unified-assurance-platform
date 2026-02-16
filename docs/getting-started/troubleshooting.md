# Troubleshooting (Top 20)

Practical fixes for common onboarding and governance failures.

1. **`make validate` fails**  
   Run from repo root. Re-clone if core files are missing.

2. **`make onboard` usage error**  
   Provide all required args: `SERVICE`, `TYPE`, `TIER`, `OWNERS`.

3. **Invalid service type**  
   Use only: `api`, `frontend`, `worker`, `shared-lib`.

4. **Invalid risk tier**  
   Use only: `low`, `medium`, `high`, `critical`.

5. **Preflight fails immediately**  
   Open `artifacts/latest/preflight-summary.md` and referenced `preflight-*.log` files.

6. **Preflight says wrong module in score check**  
   Re-run with the same service name: `make preflight MODULE=<service> TYPE=<type>`.

7. **`make tooling-check` reports missing tools**  
   Install missing binaries from `docs/required-tooling.md`.

8. **Playwright smoke fails (`browser not found`)**  
   Run `npm install && npx playwright install chromium`.

9. **Playwright dependency issues on macOS**  
   Update Node and reinstall dependencies: `brew upgrade node && npm ci`.

10. **Port conflicts (3000/9090/8790 etc.)**  
    Stop conflicting apps or use provided fallback commands (`make demo-site-up` auto-tries 8790-8792).

11. **Docker compose fails**  
    Start Docker Desktop first; verify `docker compose version`.

12. **ZAP cannot reach local target**  
    For containerized path, target `http://host.docker.internal:<port>`.

13. **ZAP level mismatch (false promotion failures)**  
    Align `ZAP_FAIL_LEVEL` with expected threshold and policy environment.

14. **Promotion check fails: missing signatures**  
    Create/sign bundle (`make evidence-bundle && make sign-bundle`) or provide approved skip reason artifact when policy allows.

15. **Promotion check fails: exception tier mismatch**  
    Exception `tier` must match current service risk tier exactly.

16. **Promotion check fails: exception expired**  
    Renew with future `expires_at` and valid approver.

17. **Promotion check fails: mandatory control failed**  
    Fix underlying control test (SAST/SCA/DAST/perf/contract/resilience/chaos) or use approved temporary exception.

18. **Promotion check fails: flaky policy not allowed**  
    Review `artifacts/latest/flaky-policy.json`; stabilize test or adjust policy thresholds through governance.

19. **Grafana dashboard has no onboarding data**  
    Ensure results exist, then export metrics (`make assurance-metrics-export`) and verify Prometheus scrape target.

20. **`assurance-governance-check` fails but stack is up**  
    Wait ~15-30s for metrics scrape, rerun check, and inspect queries in Prometheus UI.

## Useful files to inspect first

- `artifacts/latest/preflight-summary.md`
- `artifacts/latest/failure-explanations.md`
- `artifacts/latest/promotion-decision.json`
- `artifacts/latest/exceptions-audit.json`
- `artifacts/latest/flaky-policy.json`
- `artifacts/metrics/assurance.prom`
