import fs from 'node:fs';
import path from 'node:path';
import { repoRoot, runArtifactsRoot } from './config.mjs';

export function createRunArtifactSkeleton(run) {
  const absDir = path.join(runArtifactsRoot, run.id);
  fs.mkdirSync(absDir, { recursive: true });

  const meta = {
    runId: run.id,
    type: run.type,
    createdAt: run.createdAt,
    request: run.request,
    command: run.command
  };

  fs.writeFileSync(path.join(absDir, 'metadata.json'), `${JSON.stringify(meta, null, 2)}\n`, 'utf8');

  const pointerMap = {
    runId: run.id,
    immutableDir: path.relative(repoRoot, absDir),
    stdoutPath: run.stdoutPath,
    stderrPath: run.stderrPath,
    trackedArtifacts: run.artifacts
  };
  fs.writeFileSync(path.join(absDir, 'pointers.json'), `${JSON.stringify(pointerMap, null, 2)}\n`, 'utf8');
}

export function finalizeRunArtifacts(run) {
  const absDir = path.resolve(repoRoot, run.runArtifactDir);
  fs.mkdirSync(absDir, { recursive: true });

  const copied = {};
  for (const [key, relPath] of Object.entries(run.artifacts || {})) {
    const sourceAbs = path.resolve(repoRoot, relPath);
    if (!sourceAbs.startsWith(repoRoot + path.sep)) continue;
    if (!fs.existsSync(sourceAbs) || !fs.statSync(sourceAbs).isFile()) continue;

    const artifactTarget = path.join(absDir, `${key}-${path.basename(sourceAbs)}`);
    fs.copyFileSync(sourceAbs, artifactTarget);
    copied[key] = path.relative(repoRoot, artifactTarget);
  }

  const out = {
    runId: run.id,
    finalizedAt: new Date().toISOString(),
    copiedArtifacts: copied,
    livePointers: run.artifacts || {},
    stdoutPath: run.stdoutPath,
    stderrPath: run.stderrPath
  };

  fs.writeFileSync(path.join(absDir, 'result-map.json'), `${JSON.stringify(out, null, 2)}\n`, 'utf8');
  return copied;
}
