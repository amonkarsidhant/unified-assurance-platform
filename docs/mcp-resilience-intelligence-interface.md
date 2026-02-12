# MCP-ready interface (Phase 2-lite): Resilience Intelligence

This repository provides command wrappers to let an MCP client trigger resilience intelligence and read artifacts without embedding repo internals.

## Commands

### Trigger run

```bash
scripts/mcp-resilience-intelligence-run.sh [MODE] [SCENARIO]
```

Examples:

```bash
scripts/mcp-resilience-intelligence-run.sh ROBUSTNESS robustness-fixed
scripts/mcp-resilience-intelligence-run.sh CHAOS network-partition-api
```

Outputs:
- exits non-zero on hard failure
- prints artifact path: `artifacts/latest/resilience-intelligence.json`

### Discover output artifacts

```bash
scripts/mcp-resilience-intelligence-artifacts.sh
```

Returns JSON with key artifact paths:
- `resilience_intelligence`
- `resilience_report`
- `adapter_inputs`
- `status_file`

## Minimal MCP client flow

1. Execute run wrapper with desired mode/scenario.
2. Read `artifacts/latest/resilience-intelligence.json`.
3. Optionally read `artifacts/latest/resilience-intelligence-report.md`.
4. Optionally ingest `artifacts/latest/resilience-adapters.json` for adapter metadata.

This is intentionally lightweight and avoids a full MCP server rewrite.
