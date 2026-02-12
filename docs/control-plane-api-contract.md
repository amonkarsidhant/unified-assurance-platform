# UAP Control Plane API Contract (Hardened MVP)

Base URL (local default): `http://localhost:4172`  
Content type: `application/json`

If `CONTROL_PLANE_API_TOKEN` is set, all endpoints except `/health` require either:
- `Authorization: Bearer <token>` or
- `X-Control-Plane-Token: <token>`

## Data model

### Run
```json
{
  "id": "run_1739399700123_ab12cd",
  "type": "assurance",
  "status": "running",
  "createdAt": "2026-02-12T17:20:01.123Z",
  "startedAt": "2026-02-12T17:20:01.223Z",
  "finishedAt": null,
  "heartbeatAt": "2026-02-12T17:20:03.000Z",
  "durationMs": null,
  "exitCode": null,
  "command": ["./scripts/run-assurance.sh"],
  "request": {},
  "artifacts": {
    "results": "artifacts/latest/results.json"
  },
  "stdoutPath": "artifacts/control-plane/logs/run_...stdout.log",
  "stderrPath": "artifacts/control-plane/logs/run_...stderr.log",
  "runArtifactDir": "artifacts/control-plane/runs/run_...",
  "error": null
}
```

### Status enum
- `queued`
- `running`
- `passed`
- `failed`
- `canceled`

### Type enum
- `assurance`
- `resilience`
- `incident`

---

## Endpoints

### `GET /health`
Returns health status without auth requirement.

### `POST /runs/assurance`
Trigger assurance run (queued for worker execution).

### `POST /runs/resilience`
Trigger resilience run (queued for worker execution).

### `POST /runs/incident`
Trigger incident flow.

**Request body**
```json
{
  "payloadPath": "examples/incidents/sample-incident.json"
}
```

**Validation rules**
- JSON object body required
- `payloadPath` required
- path must remain inside repository root
- path must end in `.json`
- file must exist and be a regular file

### `GET /runs`
List runs (newest first).

### `GET /runs/{id}`
Get run detail plus related events.

---

## Error envelope
```json
{
  "error": "<error_code>",
  "message": "Human-readable summary",
  "details": {}
}
```

## Security constraints
- Strict allowlist maps run type -> executable + fixed args template.
- No shell interpolation (`spawn` arg array, `shell: false`).
- Audit trigger events are recorded in `run_events` as `audit.trigger`.
