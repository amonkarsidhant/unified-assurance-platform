# UAP Control Plane MVP (2-Week)

## Objective
Deliver a thin, production-oriented control plane that lets platform and QA operators trigger assurance/resilience/incident runs, inspect run history, and follow artifact pointers from one place.

The MVP must orchestrate existing UAP scripts (not replace them) and provide safe, auditable triggering with minimal setup.

## Scope (2-week MVP)

### In scope
- Minimal Control Plane UI with three views:
  - Dashboard
  - Runs list
  - Run detail
- Minimal Control Plane API with endpoints:
  - `POST /runs/assurance`
  - `POST /runs/resilience`
  - `POST /runs/incident`
  - `GET /runs`
  - `GET /runs/{id}`
- Safe run orchestration via strict command allowlist
- Local run metadata persistence in `artifacts/control-plane/runs.json`
- Artifact pointers in run records (e.g., `artifacts/latest/results.json`)
- Clear logging and structured JSON error responses

### Operational goals
- Trigger-to-run visibility in < 10 seconds
- New run record created for every trigger attempt
- Deterministic mapping from run type to script command
- Human-demoable in 10 minutes

## Non-goals (MVP)
- Multi-tenant authN/authZ and SSO integration
- Distributed queue or horizontally scalable scheduler
- Full RBAC policy engine
- Real-time log streaming and WebSocket tailing
- Long-term database (Postgres, etc.)
- Artifact blob lifecycle management (S3/GCS)

## User roles

### Platform Operator
- Triggers assurance and resilience runs
- Monitors run status and outcomes
- Uses run history to guide release readiness

### Incident Commander / SRE
- Triggers incident diagnostics payload
- Uses run detail to inspect outputs quickly

### Quality Lead / Engineering Manager
- Views run history and pass/fail trends
- Uses artifact pointers for review and governance conversations

## Core workflows

### 1) Trigger run (assurance/resilience)
1. User opens Dashboard or Runs page
2. Clicks trigger action (Assurance/Resilience)
3. API validates request and creates `queued` run record
4. API starts allowlisted subprocess
5. Run status progresses `queued -> running -> completed|failed`
6. UI refreshes and shows new run

### 2) View run history
1. User opens Runs page
2. UI calls `GET /runs`
3. API returns reverse-chronological run records
4. User sees type, status, timestamps, duration, artifact pointers

### 3) Inspect artifacts
1. User opens run detail
2. UI calls `GET /runs/{id}`
3. Run detail shows artifact pointers (file paths)
4. User jumps to artifacts for deeper analysis

### 4) Incident trigger
1. User posts incident payload path (e.g. `examples/incidents/sample-incident.json`)
2. API validates path safety and existence
3. API executes allowlisted incident command with payload arg
4. Run record captures payload path and outputs

## Architecture (MVP)

### Frontend
- Static HTML/JS app in `apps/control-plane/ui`
- Three pages:
  - `index.html` (Dashboard)
  - `runs.html` (Run history)
  - `run.html` (Run detail)
- Fetches API directly (`http://localhost:4172`)

### Backend API
- Node.js HTTP server (`apps/control-plane/api/server.mjs`)
- No external runtime deps (keeps bootstrap friction low)
- Responsibilities:
  - Request validation
  - Allowlisted command mapping
  - Process spawn and lifecycle updates
  - JSON persistence of run metadata
  - Standardized error responses

### Job runner model
- In-process subprocess launcher (`child_process.spawn`)
- Asynchronous status updates to metadata store
- Strict allowlist prevents arbitrary command execution

### Artifact store pointers
- Metadata store: `artifacts/control-plane/runs.json`
- Run artifact pointers include current UAP outputs, e.g.:
  - `artifacts/latest/results.json`
  - `artifacts/latest/resilience-intelligence.json`
  - `artifacts/latest/incident-trigger-result.json`

## MVP success criteria
- A user can trigger at least one run from API and see it in history
- Run detail contains status, timestamps, and artifact pointers
- Incident endpoint rejects unsafe payload paths
- Demo flow works with `make control-plane-demo`
