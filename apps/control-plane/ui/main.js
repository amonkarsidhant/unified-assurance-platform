const API = window.CONTROL_PLANE_API || 'http://localhost:4172';
const result = document.getElementById('result');

/**
 * Send a POST request with a JSON payload to the control-plane API at the given path and display the parsed response or any error in the page's result element.
 *
 * @param {string} path - The API path to POST to (appended to the configured API base URL).
 * @param {Object} [body={}] - JSON-serializable payload to send as the request body.
 */
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