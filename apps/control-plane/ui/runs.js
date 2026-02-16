const API = window.CONTROL_PLANE_API || 'http://localhost:4172';
const list = document.getElementById('runs');

function setListMessage(message) {
  if (!list) return;
  list.innerHTML = '';
  const li = document.createElement('li');
  li.textContent = message;
  list.appendChild(li);
}

async function loadRuns() {
  setListMessage('Loading...');
  try {
    const res = await fetch(`${API}/runs`);
    const data = await res.json();
    const runs = data.runs || [];
    if (!runs.length) {
      setListMessage('No runs yet');
      return;
    }

    if (!list) return;
    list.innerHTML = '';
    for (const run of runs) {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = `./run.html?id=${encodeURIComponent(run.id)}`;
      link.textContent = run.id;
      li.appendChild(link);
      li.appendChild(document.createTextNode(` - ${run.type} - ${run.status}`));
      list.appendChild(li);
    }
  } catch (err) {
    setListMessage(`Error: ${String(err)}`);
  }
}

const refreshBtn = document.getElementById('refresh');
if (refreshBtn) refreshBtn.onclick = loadRuns;
loadRuns();
