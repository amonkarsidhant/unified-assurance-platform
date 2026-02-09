# Golden Path: Event-Driven Service

## Baseline controls
- Schema compatibility checks
- Consumer-driven contract tests
- Idempotency and replay tests
- DLQ/error budget monitoring checks

## Suggested commands
```bash
npm ci
npm test
npm run test:contracts
npm run test:replay
```

## Required evidence
- Schema registry compatibility result
- Consumer contract status
- Replay/idempotency test report
