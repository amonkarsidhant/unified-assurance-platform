const API = window.CONTROL_PLANE_API || 'http://localhost:4172';
const detail = document.getElementById('detail');
const id = new URLSearchParams(window.location.search).get('id');

/**
 * Load the run identified by the page's `id` query parameter and render its details into the `detail` element.
 *
 * If the `id` parameter is missing, sets `detail.textContent` to "Missing run id".
 * On success, pretty-prints the run JSON into `detail.textContent`.
 * On failure, sets `detail.textContent` to the error string.
 */
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