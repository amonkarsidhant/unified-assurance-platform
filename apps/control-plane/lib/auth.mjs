import { apiToken } from './config.mjs';

export function isAuthRequired() {
  return Boolean(apiToken);
}

export function isAuthorized(req) {
  if (!isAuthRequired()) return true;

  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
  const fallback = req.headers['x-control-plane-token'] || '';

  return bearer === apiToken || fallback === apiToken;
}
