# Golden Path: API Service

## Baseline controls
- Unit + integration + contract tests
- OpenAPI lint/validation
- Dependency vulnerability scan
- p95 latency smoke threshold

## Suggested commands
```bash
npm ci
npm run lint
npm test
npm run test:integration
npm run test:contract
```

## Required evidence
- JUnit/XML or JSON test outputs
- API contract diff/check result
- Dependency scan summary
- Performance smoke output
