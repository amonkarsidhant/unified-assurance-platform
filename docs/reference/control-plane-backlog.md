# UAP Control Plane MVP Backlog

## Sprint framing (2 weeks)

- Sprint length: 10 working days
- Objective: ship a runnable MVP control plane for triggering and tracking UAP runs
- Prioritization:
  - **P0** = must-have for MVP demo and operator utility
  - **P1** = high-value hardening/usability after P0

---

## P0 Stories (Must-have)

### CP-001: API skeleton with health + run endpoints

**Story**: As an operator, I can call minimal control-plane endpoints to create and list runs.

**Acceptance criteria**
- API starts with `node apps/control-plane/api/server.mjs`
- Supports:
  - `GET /health`
  - `POST /runs/assurance`
  - `POST /runs/resilience`
  - `POST /runs/incident`
  - `GET /runs`
  - `GET /runs/{id}`
- Returns JSON with proper HTTP status codes (including `GET /health` => `200 {"status":"ok"}`)

---

### CP-002: Strict allowlisted command execution

**Story**: As a platform owner, I need command execution to be safe and non-arbitrary.

**Acceptance criteria**
- Command map is hardcoded by run type
- No user-provided command is executed directly
- Incident flow only passes validated payload path to allowlisted command
- Unsafe input returns `400` with clear error message

---

### CP-003: Run metadata persistence

**Story**: As an operator, I can see run history even after restarting API.

**Acceptance criteria**
- Run metadata persisted to SQLite database at `artifacts/control-plane/control-plane.db`
- `runs` table stores at minimum: `id`, `type`, `status`, timestamps (`created_at`, `started_at`, `finished_at`, `updated_at`, `heartbeat_at`), `exit_code`, `artifacts_json` (artifact pointers), and `request_json` (payload metadata)
- API list and detail are served from SQLite persisted state (querying `runs`, with event enrichment from `run_events`)

---

### CP-004: Frontend skeleton (Dashboard, Runs, Run Detail)

**Story**: As an operator, I can use a simple browser UI to trigger and inspect runs.

**Acceptance criteria**
- Static UI under `apps/control-plane/ui`
- Pages:
  - Dashboard with trigger buttons
  - Runs list
  - Run detail view by `id`
- Pages fetch API and render run data

---

### CP-005: Makefile developer workflow targets

**Story**: As a developer/demo owner, I can start API/UI and run a smoke demo via make.

**Acceptance criteria**
- Targets added:
  - `make control-plane-api`
  - `make control-plane-ui`
  - `make control-plane-up`
  - `make control-plane-demo`
- `control-plane-demo` exercises at least one trigger path and list/detail retrieval

---

### CP-006: Logging and error quality

**Story**: As an operator, I get clear feedback when runs fail or input is invalid.

**Acceptance criteria**
- API logs run start/completion/failure with run ID and type
- Error responses are structured JSON (`error`, `message`, optionally `details`)
- Non-existent run id returns `404` JSON

---

## P1 Stories (Should-have)

### CP-101: Polling UX improvements

**Story**: As an operator, run status updates automatically.

**Acceptance criteria**
- Auto-refresh on list/detail every 5-10s
- Loading/error state indicators in UI

---

### CP-102: Basic filter/sort for runs

**Story**: As a quality lead, I can quickly isolate failed runs.

**Acceptance criteria**
- Client-side filter by type/status
- Default newest-first sorting

---

### CP-103: Enriched artifact index

**Story**: As an incident commander, I can quickly navigate generated outputs.

**Acceptance criteria**
- Per-run `artifacts` object includes common known file pointers
- UI presents clickable pointer list

---

### CP-104: Minimal contract tests for control-plane API

**Story**: As an engineer, I can validate endpoint behavior regressions.

**Acceptance criteria**
- Tests for create/list/detail and unsafe incident payload rejection
- Runnable in existing test framework

---

### CP-105: Configurable ports/envs

**Story**: As a developer, I can run control plane on non-default ports.

**Acceptance criteria**
- API port and host configurable via env vars
- UI documents API base URL override

---

## Definition of done (MVP)

- All P0 accepted
- `make validate` still passes
- Control-plane demo command executes successfully
- Docs updated (MVP, backlog, API contract)
