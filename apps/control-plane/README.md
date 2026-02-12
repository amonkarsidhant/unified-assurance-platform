# UAP Control Plane (MVP)

Minimal control plane for triggering and tracking UAP runs.

## Components
- `api/server.mjs` - Node HTTP API (no external runtime deps)
- `ui/` - static frontend pages (dashboard, runs, run detail)

## Prerequisites
- Node.js 18+
- Python 3 (for simple static file serving via `http.server`)

## Run

### API
```bash
make control-plane-api
```
Default: `http://localhost:4172`

### UI
In another terminal:
```bash
make control-plane-ui
```
Default: `http://localhost:4173`

### Run both
```bash
make control-plane-up
```

## Demo
```bash
make control-plane-demo
```
This triggers an assurance run and checks list/detail endpoints.

## API endpoints
- `POST /runs/assurance`
- `POST /runs/resilience`
- `POST /runs/incident`
- `GET /runs`
- `GET /runs/{id}`

## Data persistence
Run metadata is stored at:
- `artifacts/control-plane/runs.json`
- logs under `artifacts/control-plane/logs/`

## Safety
- Strict allowlisted command mapping only
- Incident payload path validation to prevent unsafe file access
- Structured JSON error responses and run logging
