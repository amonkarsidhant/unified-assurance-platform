# UAP Control Plane (Hardened MVP)

Production-leaning hardening of the Control Plane MVP with explicit lifecycle state handling, durable queue/storage, and API/worker process separation.

## Architecture

- `api/server.mjs`: HTTP API for trigger/list/detail and request validation.
- `worker/worker.mjs`: queue worker that claims queued runs and executes allowlisted commands.
- `lib/db.mjs`: SQLite schema + best-effort migration from legacy `runs.json`.
- `lib/repository.mjs`: atomic lifecycle transitions + event/audit writes.
- `lib/artifacts.mjs`: immutable run-scoped artifact directory + pointer maps.
- `ui/`: static pages (optional local UI) with operator-focused status chips, timeline, artifacts, and guided failure handling.

## Lifecycle State Machine

Runs move through:

`queued -> running -> passed | failed | canceled`

Current implementation supports terminal transitions to `passed/failed` by worker execution, and keeps `canceled` reserved for a follow-up cancel endpoint.

Startup stale-run reconciliation marks orphaned `running` rows as `failed` when heartbeat timeout is exceeded.

## Storage

- Primary: `artifacts/control-plane/control-plane.db` (SQLite, WAL mode)
- Legacy migration (best effort): `artifacts/control-plane/runs.json` to SQLite on first boot
- Immutable per-run artifacts: `artifacts/control-plane/runs/<run-id>/`
- Stream logs: `artifacts/control-plane/logs/<run-id>.stdout.log|stderr.log`

## Security controls

- Strict command allowlist by run type.
- Incident payload request validation + path sanitization (must remain inside repo and be `.json`).
- Optional token auth via env (`CONTROL_PLANE_API_TOKEN`) using `Authorization: Bearer ...` or `X-Control-Plane-Token`.
- Audit event logging for trigger actions (`audit.trigger`).

## Run locally

### 1) API

```bash
make control-plane-api
```

### 2) Worker

```bash
make control-plane-worker
```

### 3) UI (optional)

```bash
make control-plane-ui
```

### 4) All together

```bash
make control-plane-up
```

## Demo

```bash
make control-plane-demo
```

## UI operator workflow notes

- Dashboard trigger actions disable while requests are in flight and show success/failure banners.
- Runs list renders explicit loading, empty, and actionable error states.
- Run detail renders status-aware states (`loading`, `not found`, API error), timeline metadata, artifact cards, and a direct operator guidance panel when a run fails.
- Status colors are consistent across pages:
  - `queued` → neutral slate
  - `running` → blue
  - `passed` → green
  - `failed` → red
  - `canceled` → amber

## Key env vars

- `CONTROL_PLANE_HOST` (default `0.0.0.0`)
- `CONTROL_PLANE_PORT` (default `4172`)
- `CONTROL_PLANE_DB_PATH` (default `artifacts/control-plane/control-plane.db`)
- `CONTROL_PLANE_API_TOKEN` (optional token auth)
- `CONTROL_PLANE_WORKER_POLL_MS` (default `800`)
- `CONTROL_PLANE_WORKER_HEARTBEAT_MS` (default `1000`)
- `CONTROL_PLANE_STALE_RUN_TIMEOUT_MS` (default `300000`)

## API endpoints

- `GET /health`
- `GET /runs`
- `GET /runs/{id}`
- `POST /runs/assurance`
- `POST /runs/resilience`
- `POST /runs/incident`

### Assurance core ingestion/query endpoints (P0 PR-1)

- `POST /ingest/execution`
- `POST /ingest/evidence`
- `POST /ingest/signals`
- `GET /query/executions?service=&commitSha=&environment=&limit=&offset=`
- `GET /query/evidence?executionId=`
- `GET /query/signals?executionId=`
- `POST /policy/evaluate?executionId=`
- `GET /decisions/{id}`

### Sample payloads

```bash
curl -X POST http://127.0.0.1:4172/ingest/execution \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "exec-1",
    "service": "payments-api",
    "repo": "amonkarsidhant/unified-assurance-platform",
    "commitSha": "abc123",
    "branch": "main",
    "environment": "staging",
    "startedAt": "2026-02-17T09:00:00.000Z",
    "source": { "provider": "github-actions", "version": "1" }
  }'

curl -X POST http://127.0.0.1:4172/ingest/evidence \
  -H 'Content-Type: application/json' \
  -d '{
    "items": [{
      "id": "ev-1",
      "executionId": "exec-1",
      "category": "unit",
      "kind": "artifact",
      "uri": "artifacts/junit.xml",
      "source": { "tool": "jest", "adapter": "artifact-junit" },
      "createdAt": "2026-02-17T09:01:00.000Z"
    }]
  }'

curl -X POST http://127.0.0.1:4172/ingest/signals \
  -H 'Content-Type: application/json' \
  -d '{
    "items": [{
      "id": "sig-1",
      "executionId": "exec-1",
      "category": "unit",
      "status": "pass",
      "name": "unit-pass-rate",
      "value": 98.4,
      "unit": "%",
      "evidenceIds": ["ev-1"],
      "createdAt": "2026-02-17T09:02:00.000Z"
    }]
  }'

curl -X POST 'http://127.0.0.1:4172/policy/evaluate?executionId=exec-1' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "rules": [{
      "id": "unit-hard-gate",
      "name": "Unit pass rate main gate",
      "mode": "hard",
      "scope": { "branches": ["main"], "categories": ["unit"] },
      "condition": { "signalName": "unit-pass-rate", "operator": "gte", "threshold": 95 },
      "failMessage": "Unit pass rate below 95% on main"
    }]
  }'

curl -X GET http://127.0.0.1:4172/decisions/<decision-id> \
  -H 'Authorization: Bearer <token>'
```

Sample `POST /policy/evaluate` response:

```json
{
  "decision": {
    "id": "a2f7a8e2-2f11-4f59-b98e-7d3b7dc59e95",
    "executionId": "exec-1",
    "outcome": "advisory",
    "summary": "1 advisory rule(s) failed",
    "evaluations": [
      {
        "ruleId": "unit-hard-gate",
        "passed": false,
        "mode": "hard",
        "reason": "Unit pass rate below 95% on main",
        "evidenceIds": ["ev-1"]
      }
    ],
    "createdAt": "2026-02-17T09:03:00.000Z"
  }
}
```

Sample `GET /decisions/{id}` success response:

```json
{
  "decision": {
    "id": "a2f7a8e2-2f11-4f59-b98e-7d3b7dc59e95",
    "executionId": "exec-1",
    "outcome": "advisory",
    "summary": "1 advisory rule(s) failed",
    "evaluations": [],
    "createdAt": "2026-02-17T09:03:00.000Z"
  }
}
```

Sample `GET /decisions/{id}` not found response:

```json
{
  "error": "not_found",
  "message": "Decision not found"
}
```
