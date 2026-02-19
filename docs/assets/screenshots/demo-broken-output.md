# Demo Output - Broken Path

```
$ make demo-broken
Report written to artifacts/latest/demo-broken-report.md
Broken demo report: artifacts/latest/demo-broken-report.md
```

## Report Summary

- **Service:** demo-service
- **Recommendation:** NO-GO
- **Risk Tier:** n/a

## Key Gates Failed

| Gate | Value | Status |
|------|-------|--------|
| test_pass_rate | 0.67 | FAIL |
| critical_test_failures | 2 | FAIL |
| high_vulnerabilities | 1 | FAIL |
| availability_slo | 99.1 | FAIL |

## Why NO-GO?

The broken demo shows what happens when gates fail:
- Test pass rate dropped below threshold
- Critical test failures detected
- High-severity vulnerabilities found
- Availability SLO below target
