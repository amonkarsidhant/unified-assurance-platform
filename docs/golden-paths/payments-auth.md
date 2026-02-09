# Golden Path: Payments & Auth

## Baseline controls
- Mandatory high-severity vulnerability gate
- AuthN/AuthZ negative-path tests
- Fraud/rate-limit control checks
- Sensitive-data logging and encryption checks

## Suggested commands
```bash
npm ci
npm test
npm run test:security
npm run test:auth-flows
```

## Required evidence
- Security scan (SAST/SCA) report
- Auth flow coverage and failures
- Key management/config verification notes
