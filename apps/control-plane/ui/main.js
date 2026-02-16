const API = window.CONTROL_PLANE_API || 'http://localhost:4172';

const result = document.getElementById('result');
const banner = document.getElementById('banner');
const assuranceBtn = document.getElementById('assuranceBtn');
const resilienceBtn = document.getElementById('resilienceBtn');
const incidentBtn = document.getElementById('incidentBtn');
const incidentPathInput = document.getElementById('incidentPath');
const triggerButtons = [assuranceBtn, resilienceBtn, incidentBtn].filter(Boolean);

async function parseResponseBody(res) {
  try {
    return await res.json();
  } catch {
    return await res.text();
  }
}

function setBanner(type, message) {
  if (!banner) return;
  banner.className = `banner ${type}`;
  banner.textContent = message;
}

function clearBanner() {
  if (!banner) return;
  banner.className = 'banner hidden';
  banner.textContent = '';
}

function setActionsDisabled(disabled) {
  for (const btn of triggerButtons) btn.disabled = disabled;
  if (incidentPathInput) incidentPathInput.disabled = disabled;
}

async function trigger(path, body = {}, label = 'Run') {
  clearBanner();
  setActionsDisabled(true);
  if (result) result.textContent = `${label} request in progress...`;

  try {
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const payload = await parseResponseBody(res);
    if (!res.ok) {
      const details = typeof payload === 'string' ? payload : payload?.message || JSON.stringify(payload);
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${details}`);
    }

    if (result) result.textContent = JSON.stringify(payload, null, 2);
    setBanner('success', `${label} queued successfully. Open Runs to monitor status.`);
  } catch (err) {
    if (result) result.textContent = String(err);
    setBanner('error', `${label} trigger failed. Verify API/worker health, then retry.`);
  } finally {
    setActionsDisabled(false);
  }
}

if (assuranceBtn) assuranceBtn.onclick = () => trigger('/runs/assurance', {}, 'Assurance');
if (resilienceBtn) resilienceBtn.onclick = () => trigger('/runs/resilience', {}, 'Resilience');
if (incidentBtn) {
  incidentBtn.onclick = () => {
    const payloadPath = incidentPathInput?.value?.trim();
    if (!payloadPath) {
      if (result) result.textContent = 'Incident payload path is required';
      setBanner('error', 'Incident trigger failed: provide a payload path ending in .json.');
      return;
    }
    if (!payloadPath.endsWith('.json')) {
      if (result) result.textContent = 'Incident payload path must end with .json';
      setBanner('error', 'Incident trigger failed: provide a payload path ending in .json.');
      return;
    }
    trigger('/runs/incident', { payloadPath }, 'Incident');
  };
}
