const API = window.CONTROL_PLANE_API || 'http://localhost:4172';
const detail = document.getElementById('detail');
const id = new URLSearchParams(window.location.search).get('id');

async function parseResponseBody(res) {
  try {
    return await res.json();
  } catch {
    return await res.text();
  }
}

async function loadRun() {
  if (!id) {
    if (detail) detail.textContent = 'Missing run id';
    return;
  }

  try {
    const res = await fetch(`${API}/runs/${encodeURIComponent(id)}`);
    const payload = await parseResponseBody(res);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${typeof payload === 'string' ? payload : JSON.stringify(payload)}`);
    }
    if (detail) detail.textContent = JSON.stringify(payload, null, 2);
  } catch (err) {
    if (detail) detail.textContent = String(err);
  }
}

loadRun();
