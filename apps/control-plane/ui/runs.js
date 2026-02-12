const API = window.CONTROL_PLANE_API || 'http://localhost:4172';
const list = document.getElementById('runs');

async function loadRuns() {
  list.innerHTML = '<li>Loading...</li>';
  try {
    const res = await fetch(`${API}/runs`);
    const data = await res.json();
    const runs = data.runs || [];
    if (!runs.length) {
      list.innerHTML = '<li>No runs yet</li>';
      return;
    }
    list.innerHTML = runs
      .map(
        (run) =>
          `<li><a href="./run.html?id=${encodeURIComponent(run.id)}">${run.id}</a> - ${run.type} - ${run.status}</li>`
      )
      .join('');
  } catch (err) {
    list.innerHTML = `<li>Error: ${String(err)}</li>`;
  }
}

document.getElementById('refresh').onclick = loadRuns;
loadRuns();
