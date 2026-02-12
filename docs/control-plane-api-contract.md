# UAP Control Plane API Contract (MVP)

Base URL (local default): `http://localhost:4172`
Content type: `application/json`

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
  "durationMs": null,
  "exitCode": null,
  "command": ["./scripts/run-assurance.sh"],
  "request": {},
  "artifacts": {
    "results": "artifacts/latest/results.json"
  },
  "stdoutPath": "artifacts/control-plane/logs/run_...stdout.log",
  "stderrPath": "artifacts/control-plane/logs/run_...stderr.log",
  "error": null
}
```

### Status enum
- `queued`
- `running`
- `completed`
- `failed`

### Type enum
- `assurance`
- `resilience`
- `incident`

---

## Endpoints

### `POST /runs/assurance`
Trigger assurance pipeline run.

**Request body**
```json
{}
```

**Response `202 Accepted`**
```json
{
  "run": { "id": "run_...", "type": "assurance", "status": "queued" }
}
```

---

### `POST /runs/resilience`
Trigger resilience intelligence run.

**Request body**
```json
{}
```

**Response `202 Accepted`**
```json
{
  "run": { "id": "run_...", "type": "resilience", "status": "queued" }
}
```

---

### `POST /runs/incident`
Trigger incident analysis flow with payload path.

**Request body**
```json
{
  "payloadPath": "examples/incidents/sample-incident.json"
}
```

**Validation rules**
- `payloadPath` required
- must resolve under repo root
- must end in `.json`
- file must exist

**Response `202 Accepted`**
```json
{
  "run": { "id": "run_...", "type": "incident", "status": "queued" }
}
```

**Error `400 Bad Request`**
```json
{
  "error": "bad_request",
  "message": "Invalid incident payload path"
}
```

---

### `GET /runs`
List runs (newest first).

**Response `200 OK`**
```json
{
  "runs": [
    {
      "id": "run_...",
      "type": "assurance",
      "status": "completed"
    }
  ]
}
```

---

### `GET /runs/{id}`
Get run detail.

**Response `200 OK`**
```json
{
  "run": {
    "id": "run_...",
    "type": "incident",
    "status": "failed",
    "error": "script exited with code 1"
  }
}
```

**Error `404 Not Found`**
```json
{
  "error": "not_found",
  "message": "Run not found"
}
```

---

## Error envelope
All errors should follow:
```json
{
  "error": "<error_code>",
  "message": "Human-readable summary",
  "details": {}
}
```

## Security constraints (MVP)
- Strict internal allowlist maps run type -> executable + fixed args
- No shell interpolation (`spawn` with args array, `shell: false`)
- Incident payload path validated before invocation
