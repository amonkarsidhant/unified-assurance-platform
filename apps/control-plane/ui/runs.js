const API = window.CONTROL_PLANE_API || 'http://localhost:4172';
const list = document.getElementById('runs');

/**
 * Fetches run records from the configured control-plane API and renders them into the runs list in the DOM.
 *
 * Sets a "Loading..." item while fetching. If the API returns no runs, replaces the list with a "No runs yet" item.
 * On success each run is rendered as a list item containing a link to `./run.html?id=<run.id>` followed by its type and status.
 * On error replaces the list with a single item showing the error message.
 *
 * Reads the API base URL from the surrounding `API` variable and updates the DOM element referenced by the surrounding `list` variable.
 */
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