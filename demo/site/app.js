const apiStatus = document.getElementById('apiStatus');
const recommendation = document.getElementById('recommendation');
const signals = document.getElementById('signals');

const scenarios = {
  happy: {
    recommendation: 'GO',
    metrics: [
      'Test pass rate: 100%',
      'Critical failures: 0',
      'High vulnerabilities: 0',
      'Availability SLO: 99.97%',
      'p95 latency: 210ms'
    ]
  },
  broken: {
    recommendation: 'NO-GO',
    metrics: [
      'Test pass rate: 67%',
      'Critical failures: 2',
      'High vulnerabilities: 1',
      'Availability SLO: 99.1%',
      'p95 latency: 680ms'
    ]
  }
};

async function checkApi() {
  try {
    const res = await fetch('http://127.0.0.1:5678/');
    const text = await res.text();
    const ok = res.ok && text.includes('demo-api-ok');
    apiStatus.textContent = ok ? 'Healthy (demo-api-ok)' : `Unexpected response: ${text}`;
    apiStatus.className = ok ? 'ok' : 'bad';
  } catch {
    apiStatus.textContent = 'API not reachable. Run: make demo-up';
    apiStatus.className = 'bad';
  }
}

function loadScenario(name) {
  const s = scenarios[name];
  recommendation.textContent = s.recommendation;
  recommendation.className = s.recommendation === 'GO' ? 'ok' : 'bad';
  signals.innerHTML = '';
  s.metrics.forEach((m) => {
    const li = document.createElement('li');
    li.textContent = m;
    signals.appendChild(li);
  });
}

document.getElementById('checkApi').addEventListener('click', checkApi);
document.querySelectorAll('[data-scenario]').forEach((btn) => {
  btn.addEventListener('click', () => loadScenario(btn.dataset.scenario));
});

checkApi();
loadScenario('happy');
