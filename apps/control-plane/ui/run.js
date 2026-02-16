const API = window.CONTROL_PLANE_API || 'http://localhost:4172';

const stateEl = document.getElementById('runState');
const contentEl = document.getElementById('runContent');
const detailEl = document.getElementById('detail');
const runTitleEl = document.getElementById('runTitle');
const runMetaEl = document.getElementById('runMeta');
const runStatusChipEl = document.getElementById('runStatusChip');
const timelineEl = document.getElementById('timeline');
const artifactsEl = document.getElementById('artifacts');
const guidancePanelEl = document.getElementById('guidancePanel');

const id = new URLSearchParams(window.location.search).get('id');

async function parseResponseBody(res) {
  try {
    return await res.json();
  } catch {
    return await res.text();
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function setState(kind, message) {
  if (!stateEl) return;
  stateEl.className = `state ${kind}`;
  stateEl.textContent = message;
}

function formatTimestamp(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function formatDuration(ms) {
  if (typeof ms !== 'number' || Number.isNaN(ms)) return '—';
  if (ms < 1000) return `${ms} ms`;
  const seconds = Math.floor(ms / 1000);
  const remMs = ms % 1000;
  if (seconds < 60) return `${seconds}.${String(remMs).padStart(3, '0')} s`;
  const minutes = Math.floor(seconds / 60);
  const remSec = seconds % 60;
  return `${minutes}m ${remSec}s`;
}

function renderStatusChip(status) {
  if (!runStatusChipEl) return;
  const normalized = String(status || 'unknown').toLowerCase();
  runStatusChipEl.className = `status-chip status-${normalized}`;
  runStatusChipEl.textContent = normalized;
}

function renderTimeline(run) {
  if (!timelineEl) return;
  const points = [
    ['Created', formatTimestamp(run.createdAt)],
    ['Started', formatTimestamp(run.startedAt)],
    ['Last heartbeat', formatTimestamp(run.heartbeatAt)],
    ['Finished', formatTimestamp(run.finishedAt)],
    ['Duration', formatDuration(run.durationMs)]
  ];
  timelineEl.innerHTML = points
    .map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`)
    .join('');
}

function linkCard(label, path, description = '') {
  if (!path) return '';
  const safeLabel = escapeHtml(label);
  const safePath = escapeHtml(path);
  const safeDescription = description ? `<p class="muted">${escapeHtml(description)}</p>` : '';
  return `
    <article class="artifact-card">
      <h3>${safeLabel}</h3>
      ${safeDescription}
      <a href="${safePath}" target="_blank" rel="noopener noreferrer">${safePath}</a>
    </article>
  `;
}

function renderArtifacts(run) {
  if (!artifactsEl) return;
  const cards = [];

  if (run.stdoutPath) cards.push(linkCard('Stdout log', run.stdoutPath, 'Primary run stdout stream'));
  if (run.stderrPath) cards.push(linkCard('Stderr log', run.stderrPath, 'Primary run stderr stream'));
  if (run.runArtifactDir) cards.push(linkCard('Run artifact directory', run.runArtifactDir, 'Directory for run-scoped outputs'));

  const artifactMap = run.artifacts && typeof run.artifacts === 'object' ? run.artifacts : {};
  for (const [name, path] of Object.entries(artifactMap)) {
    if (!path) continue;
    cards.push(linkCard(`Artifact: ${name}`, path));
  }

  artifactsEl.innerHTML = cards.length
    ? cards.join('')
    : '<p class="muted">No artifact pointers were published for this run.</p>';
}

function renderGuidance(run) {
  if (!guidancePanelEl) return;
  if (run.status !== 'failed') {
    guidancePanelEl.innerHTML = '<h2>Operator Guidance</h2><p class="muted">No action required unless status changes.</p>';
    return;
  }

  const checks = [];
  if (run.error) checks.push(`Failure reason: ${run.error}`);
  if (typeof run.exitCode === 'number') checks.push(`Process exit code: ${run.exitCode}`);
  checks.push('Review stdout/stderr logs to identify failing command or input.');
  checks.push('Fix the root cause, then trigger a new run from Dashboard.');

  const quickLinks = [
    run.stdoutPath ? `<li><a href="${escapeHtml(run.stdoutPath)}" target="_blank" rel="noopener noreferrer">Open stdout log</a></li>` : '',
    run.stderrPath ? `<li><a href="${escapeHtml(run.stderrPath)}" target="_blank" rel="noopener noreferrer">Open stderr log</a></li>` : '',
    run.runArtifactDir
      ? `<li><a href="${escapeHtml(run.runArtifactDir)}" target="_blank" rel="noopener noreferrer">Open run artifact directory</a></li>`
      : ''
  ]
    .filter(Boolean)
    .join('');

  guidancePanelEl.innerHTML = `
    <h2>Operator Guidance</h2>
    <p class="guidance-title">What failed</p>
    <ul>${checks.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    <p class="guidance-title">What to do next</p>
    <ol>
      <li>Open the logs/artifacts below and identify the first failing step.</li>
      <li>Correct code/config/input data and commit the change.</li>
      <li>Re-run the workflow and verify status moves to <strong>passed</strong>.</li>
    </ol>
    ${quickLinks ? `<p class="guidance-title">Quick links</p><ul>${quickLinks}</ul>` : ''}
  `;
}

function renderRun(payload) {
  const run = payload?.run;
  if (!run) return;

  if (contentEl) contentEl.classList.remove('hidden');
  setState('ok', 'Run loaded.');

  if (runTitleEl) runTitleEl.textContent = run.id;
  if (runMetaEl) runMetaEl.textContent = `Type: ${run.type || 'unknown'} • Exit code: ${run.exitCode ?? 'n/a'}`;
  renderStatusChip(run.status);
  renderTimeline(run);
  renderArtifacts(run);
  renderGuidance(run);

  if (detailEl) detailEl.textContent = JSON.stringify(payload, null, 2);
}

async function loadRun() {
  if (!id) {
    setState('error', 'Missing run id. Open a run from the Runs page and retry.');
    return;
  }

  setState('loading', 'Loading run detail…');

  try {
    const res = await fetch(`${API}/runs/${encodeURIComponent(id)}`);
    const payload = await parseResponseBody(res);

    if (!res.ok) {
      if (res.status === 404) {
        setState('empty', `Run ${id} was not found. It may have expired or the id may be incorrect.`);
        return;
      }

      const message = typeof payload === 'string' ? payload : payload?.message || 'Request failed';
      setState('error', `Failed to load run (${res.status}). ${message}`);
      return;
    }

    renderRun(payload);
  } catch (err) {
    setState('error', `Unable to reach API: ${String(err)}. Confirm API is running, then retry.`);
  }
}

loadRun();
