import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const repoRoot = path.resolve(__dirname, '../../..');
export const controlPlaneRoot = path.join(repoRoot, 'artifacts/control-plane');
export const logsDir = path.join(controlPlaneRoot, 'logs');
export const runArtifactsRoot = path.join(controlPlaneRoot, 'runs');
export const dbPath = process.env.CONTROL_PLANE_DB_PATH || path.join(controlPlaneRoot, 'control-plane.db');

export const host = process.env.CONTROL_PLANE_HOST || '0.0.0.0';
export const port = Number(process.env.CONTROL_PLANE_PORT || 4172);

export const workerPollMs = Number(process.env.CONTROL_PLANE_WORKER_POLL_MS || 800);
export const workerHeartbeatMs = Number(process.env.CONTROL_PLANE_WORKER_HEARTBEAT_MS || 1000);
export const staleRunTimeoutMs = Number(process.env.CONTROL_PLANE_STALE_RUN_TIMEOUT_MS || 5 * 60 * 1000);

export const apiToken = process.env.CONTROL_PLANE_API_TOKEN || '';

export const COMMAND_ALLOWLIST = Object.freeze({
  assurance: ['./scripts/run-assurance.sh'],
  resilience: ['./scripts/run-resilience-intelligence.sh'],
  incident: ['./scripts/resilience-incident-trigger.py', '--payload', '$payloadPath']
});

export const TERMINAL_STATES = new Set(['passed', 'failed', 'canceled']);
export const ACTIVE_STATES = new Set(['queued', 'running']);
export const RUN_STATES = new Set(['queued', 'running', 'passed', 'failed', 'canceled']);
