const API = window.CONTROL_PLANE_API || 'http://localhost:4172';
const result = document.getElementById('result');

async function parseResponseBody(res) {
  try {
    return await res.json();
  } catch {
    return await res.text();
  }
}

async function trigger(path, body = {}) {
  if (result) result.textContent = 'Running...';
  try {
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const payload = await parseResponseBody(res);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${typeof payload === 'string' ? payload : JSON.stringify(payload)}`);
    }

    if (result) result.textContent = JSON.stringify(payload, null, 2);
  } catch (err) {
    if (result) result.textContent = String(err);
  }
}

const assuranceBtn = document.getElementById('assuranceBtn');
if (assuranceBtn) assuranceBtn.onclick = () => trigger('/runs/assurance');

const resilienceBtn = document.getElementById('resilienceBtn');
if (resilienceBtn) resilienceBtn.onclick = () => trigger('/runs/resilience');

const incidentBtn = document.getElementById('incidentBtn');
if (incidentBtn) {
  incidentBtn.onclick = () => {
    const incidentPathInput = document.getElementById('incidentPath');
    const payloadPath = incidentPathInput?.value?.trim();
    if (!payloadPath) {
      if (result) result.textContent = 'Incident payload path is required';
      return;
    }
    trigger('/runs/incident', { payloadPath });
  };
}
