import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { COMMAND_ALLOWLIST, repoRoot } from './config.mjs';

export function buildRunRequest(type, request = {}) {
  if (!Object.prototype.hasOwnProperty.call(COMMAND_ALLOWLIST, type)) {
    throw new Error(`unsupported run type: ${type}`);
  }

  const id = `run_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const command = compileCommand(type, request);
  const artifactDir = path.join('artifacts/control-plane/runs', id);

  return {
    id,
    type,
    command,
    request,
    artifacts: defaultArtifactPointers(type),
    stdoutPath: `artifacts/control-plane/logs/${id}.stdout.log`,
    stderrPath: `artifacts/control-plane/logs/${id}.stderr.log`,
    runArtifactDir: artifactDir
  };
}

function compileCommand(type, request) {
  const template = COMMAND_ALLOWLIST[type];
  const payloadPath = request.payloadPath;
  return template.map((part) => {
    if (part === '$payloadPath') {
      if (typeof payloadPath !== 'string' || !payloadPath) {
        throw new Error('incident payload path missing');
      }
      const resolved = path.resolve(repoRoot, payloadPath);
      const relative = path.relative(repoRoot, resolved);
      return relative;
    }
    return part;
  });
}

function defaultArtifactPointers(type) {
  if (type === 'assurance') {
    return { results: 'artifacts/latest/results.json' };
  }
  if (type === 'resilience') {
    return { resilience: 'artifacts/latest/resilience-intelligence.json' };
  }
  return { incident: 'artifacts/latest/incident-trigger-result.json' };
}
