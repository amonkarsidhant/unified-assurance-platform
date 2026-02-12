const API = window.CONTROL_PLANE_API || 'http://localhost:4172';
const detail = document.getElementById('detail');
const id = new URLSearchParams(window.location.search).get('id');

async function loadRun() {
  if (!id) {
    detail.textContent = 'Missing run id';
    return;
  }

  try {
    const res = await fetch(`${API}/runs/${encodeURIComponent(id)}`);
    const data = await res.json();
    detail.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    detail.textContent = String(err);
  }
}

loadRun();
