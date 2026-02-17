# Core vs Plugin Boundaries (UAP P0)

## Core (stable)

The control plane core owns only:

- Canonical assurance schema (`packages/assurance-schema`)
- Ingestion and query APIs
- Persistence of normalized data (executions, evidence, signals)
- Policy evaluation surface (future PR-2)

Core must remain tool-agnostic and deterministic.

## Plugin/Adapter layer (replaceable)

Tool-specific parsing and mapping lives in adapters (future PR-3), for example:

- CI providers (GitHub Actions, GitLab CI, Jenkins)
- Test artifact formats (JUnit, Playwright, Cypress)
- Security tools (SARIF, SCA scanners)
- Observability sources (OpenTelemetry, Prometheus)

Adapters transform raw input to the canonical schema.

## Hard guardrails

- Core must not import adapter or tool-specific modules.
- Policy rules must evaluate canonical signals only.
- No-data conditions must be explicit (`unknown` / `error`), never silent pass.
- Block decisions must be explainable with linked evidence IDs.
