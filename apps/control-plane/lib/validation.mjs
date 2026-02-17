import fs from 'node:fs';
import path from 'node:path';
import { ValidationError } from '../../../packages/assurance-schema/src/index.mjs';
import { repoRoot } from './config.mjs';

export function validateIncidentBody(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, reason: 'body must be a JSON object' };
  }

  const payloadPath = body.payloadPath;
  if (typeof payloadPath !== 'string' || payloadPath.trim().length === 0) {
    return { ok: false, reason: 'payloadPath is required' };
  }

  const absolutePath = path.resolve(repoRoot, payloadPath);
  const relative = path.relative(repoRoot, absolutePath);
  const escapesRoot = relative.startsWith('..') || path.isAbsolute(relative);
  if (escapesRoot) {
    return { ok: false, reason: 'payload path escapes repository root' };
  }

  if (!absolutePath.endsWith('.json')) {
    return { ok: false, reason: 'payload must be a .json file' };
  }

  if (!fs.existsSync(absolutePath)) {
    return { ok: false, reason: 'payload file does not exist' };
  }

  const stats = fs.statSync(absolutePath);
  if (!stats.isFile()) {
    return { ok: false, reason: 'payload path must be a file' };
  }

  return { ok: true, payloadPath: relative };
}

export function validateJsonBody(raw) {
  if (!raw) return {};
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ValidationError('invalid JSON body');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new ValidationError('body must be a JSON object');
  }
  return parsed;
}
