# Control Plane Hardening (MVP → Production-leaning)

This document captures what was hardened beyond the original control-plane MVP.

## Summary of hardening

1. **Lifecycle reliability**
   - Introduced explicit state model: `queued -> running -> passed|failed|canceled`.
   - Worker heartbeats `running` rows while process is alive.
   - Startup reconciliation marks stale `running` runs as `failed` with reconciliation event.
   - Transition writes are persisted to SQLite (transactional, WAL-enabled).

2. **Execution architecture split**
   - API and worker are separate entrypoints/processes:
     - `apps/control-plane/api/server.mjs`
     - `apps/control-plane/worker/worker.mjs`
   - Queue is SQLite-backed (`runs.status = queued` claimed atomically by worker).
   - Claim semantics guard against concurrent mutation races (`UPDATE ... WHERE status='queued'`).

3. **Durable storage**
   - Replaced `artifacts/control-plane/runs.json` with SQLite DB:
     - `runs` table
     - `run_events` table
   - Best-effort migration from legacy `runs.json` on first startup.
   - Migration marker file: `artifacts/control-plane/.runs-json-migrated`.

4. **Security and governance**
   - Command execution strictly from allowlisted templates.
   - Incident trigger validates JSON body + sanitizes payload path under repo root.
   - Lightweight token auth (`CONTROL_PLANE_API_TOKEN`) for non-health endpoints.
   - Audit trail event emitted on each run trigger (`event_type = audit.trigger`).

5. **Artifact immutability**
   - Each run has immutable run-scoped directory:
     - `artifacts/control-plane/runs/<run-id>/`
   - Stores `metadata.json`, `pointers.json`, and final `result-map.json`.
   - Copies available outputs from live pointers into run-scoped artifacts.

6. **Quality gates**
   - Added tests for:
     - Lifecycle transition persistence
     - Auth enforcement
     - Incident payload validation
     - Stale-run reconciliation

## Migration notes (MVP → hardened)

- Old metadata file (`runs.json`) is no longer authoritative.
- First boot of hardened API performs best-effort import if:
  - `runs.json` exists,
  - DB has no runs,
  - migration marker not present.
- Legacy `completed` status is normalized to `passed`.
- Existing scripts (`run-assurance.sh`, resilience scripts) remain unchanged and orchestrated by worker.

## Runtime model

- API accepts trigger requests and inserts `queued` row + audit event.
- Worker polls queue, atomically claims one run, executes allowlisted command, updates terminal status.
- Worker heartbeat supports stale detection if worker crashes.

## Security model

- **Auth:** token-based, opt-in via environment variable.
- **Authorization granularity:** single shared token (MVP-hardening scope).
- **Input safety:** JSON body validation + path traversal prevention for incident payload.
- **Command safety:** no arbitrary shell execution; only predefined command arrays.

## Known limitations (for enterprise v2)

- No RBAC / per-user auth identity; token is shared secret.
- No distributed queue leasing / priority scheduling.
- No run cancel endpoint wired to process signaling yet (`canceled` reserved in state model).
- No at-rest encryption for DB or artifacts.
- No signed/tamper-evident audit/event chain.
