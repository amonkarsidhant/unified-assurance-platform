const API = window.CONTROL_PLANE_API || 'http://localhost:4172';
const result = document.getElementById('result');

async function trigger(path, body = {}) {
  result.textContent = 'Running...';
  try {
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    result.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    result.textContent = String(err);
  }
}

document.getElementById('assuranceBtn').onclick = () => trigger('/runs/assurance');
document.getElementById('resilienceBtn').onclick = () => trigger('/runs/resilience');
document.getElementById('incidentBtn').onclick = () => {
  const payloadPath = document.getElementById('incidentPath').value.trim();
  trigger('/runs/incident', { payloadPath });
};
