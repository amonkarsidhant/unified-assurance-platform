export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Control-Plane-Token');
}

export function json(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

export function jsonError(res, status, error, message, details = undefined) {
  const payload = { error, message };
  if (details) payload.details = details;
  return json(res, status, payload);
}

const MAX_BODY_BYTES = 1_000_000;

export function readBody(req, maxBytes = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    let body = '';
    let settled = false;
    let onData = () => {};
    let onEnd = () => {};
    let onError = () => {};

    const finalize = (err, value = '') => {
      if (settled) return;
      settled = true;
      req.off('data', onData);
      req.off('end', onEnd);
      req.off('error', onError);
      if (err) return reject(err);
      return resolve(value);
    };

    const failTooLarge = () => {
      const error = new Error('request body too large');
      error.code = 'PAYLOAD_TOO_LARGE';
      error.statusCode = 413;
      finalize(error);
      req.destroy(error);
    };

    const contentLength = Number(req.headers['content-length']);
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      return failTooLarge();
    }

    onData = (chunk) => {
      body += chunk;
      if (body.length > maxBytes) {
        failTooLarge();
      }
    };

    onEnd = () => finalize(null, body);
    onError = (error) => finalize(error);

    req.on('data', onData);
    req.on('end', onEnd);
    req.on('error', onError);
  });
}
