const API = window.CONTROL_PLANE_API || 'http://localhost:4172';
const list = document.getElementById('runs');
const stateEl = document.getElementById('runsState');

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function statusChip(status) {
  const normalized = String(status || 'unknown').toLowerCase();
  return `<span class="status-chip status-${escapeHtml(normalized)}">${escapeHtml(normalized)}</span>`;
}

function setState(kind, message) {
  if (!stateEl) return;
  stateEl.className = `state ${kind}`;
  stateEl.innerHTML = message;
}

function renderLoadingSkeleton() {
  if (!list) return;
  list.innerHTML = '';
  for (let i = 0; i < 4; i += 1) {
    const li = document.createElement('li');
    li.className = 'run-item skeleton';
    li.innerHTML = '<div class="skeleton-line"></div><div class="skeleton-line short"></div>';
    list.appendChild(li);
  }
  setState('loading', 'Loading runs…');
}

function renderRuns(runs) {
  if (!list) return;
  list.innerHTML = '';

  for (const run of runs) {
    const li = document.createElement('li');
    li.className = 'run-item';

    const createdAt = run?.createdAt ? new Date(run.createdAt).toLocaleString() : 'unknown time';
    li.innerHTML = `
      <div class="run-item-main">
        <a class="run-link" href="./run.html?id=${encodeURIComponent(run.id)}">${escapeHtml(run.id)}</a>
        ${statusChip(run.status)}
      </div>
      <div class="run-item-sub">${escapeHtml(run.type || 'unknown')} • created ${escapeHtml(createdAt)}</div>
    `;

    list.appendChild(li);
  }
}

async function loadRuns() {
  renderLoadingSkeleton();
  try {
    const res = await fetch(`${API}/runs`);
    const payload = await res.json();

    if (!res.ok) {
      throw new Error(payload?.message || `HTTP ${res.status}`);
    }

    const runs = payload.runs || [];
    if (!runs.length) {
      if (list) list.innerHTML = '';
      setState('empty', 'No runs yet. Go to Dashboard and trigger assurance, resilience, or incident flow.');
      return;
    }

    setState('ok', `Showing ${runs.length} run${runs.length === 1 ? '' : 's'}.`);
    renderRuns(runs);
  } catch (err) {
    if (list) list.innerHTML = '';
    setState(
      'error',
      `Could not load runs (${escapeHtml(String(err))}). Confirm API is running and token/auth is configured if enabled, then retry.`
    );
  }
}

const refreshBtn = document.getElementById('refresh');
if (refreshBtn) refreshBtn.onclick = loadRuns;
loadRuns();
