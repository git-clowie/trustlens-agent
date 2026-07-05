const DEFAULT_API_BASE = 'http://127.0.0.1:8000';

const apiBaseInput = document.getElementById('apiBase');
const situationInput = document.getElementById('situation');
const messageInput = document.getElementById('message');
const analyzeBtn = document.getElementById('analyzeBtn');
const copyBtn = document.getElementById('copyBtn');
const resultBox = document.getElementById('result');
const statusText = document.getElementById('statusText');
const statusDot = document.getElementById('statusDot');
const openDashboardBtn = document.getElementById('openDashboard');

let lastReport = null;

init();

async function init() {
  const saved = await chrome.storage.local.get(['apiBase', 'situation', 'selectedText', 'lastReport', 'lastStatus']);
  apiBaseInput.value = saved.apiBase || DEFAULT_API_BASE;
  situationInput.value = saved.situation || 'before_click';
  messageInput.value = saved.selectedText || '';
  lastReport = saved.lastReport || null;

  if (lastReport) {
    renderReport(lastReport);
  } else if (saved.lastStatus) {
    statusText.textContent = saved.lastStatus;
  }
}

analyzeBtn.addEventListener('click', async () => {
  const text = messageInput.value.trim();
  if (!text) {
    renderStatus('Paste or select text first.', 'warn');
    return;
  }

  const apiBase = normalizeApiBase(apiBaseInput.value);
  const situation = situationInput.value;
  await chrome.storage.local.set({ apiBase, situation, selectedText: text });

  renderStatus('Analyzing...', 'warn');
  try {
    const report = await analyzeText(apiBase, text, situation);
    lastReport = report;
    await chrome.storage.local.set({ lastReport: report, lastStatus: `TrustLens: ${report.verdict} (${report.risk_score}/100)` });
    renderReport(report);
  } catch (error) {
    renderStatus(`Could not reach TrustLens API: ${error.message}`, 'danger');
  }
});

copyBtn.addEventListener('click', async () => {
  if (!lastReport) return;
  const summary = [
    `TrustLens: ${lastReport.verdict} (${lastReport.risk_score}/100)`,
    `Confidence: ${lastReport.confidence}%`,
    `Top signal: ${lastReport.score_trace?.[0]?.label || lastReport.breakdown?.[0] || 'review needed'}`,
    `Action: ${lastReport.safe_steps?.[0] || 'Use official channels before interacting.'}`,
  ].join('\n');
  await navigator.clipboard.writeText(summary);
  renderStatus('Summary copied.', 'safe');
});

openDashboardBtn.addEventListener('click', async () => {
  const apiBase = normalizeApiBase(apiBaseInput.value);
  await chrome.tabs.create({ url: apiBase });
});

async function analyzeText(apiBase, text, situation) {
  const response = await fetch(`${apiBase}/api/investigate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, situation }),
  });

  if (!response.ok) {
    throw new Error(`API ${response.status}`);
  }

  return response.json();
}

function renderReport(report) {
  const color = getScoreColor(report.risk_score);
  statusDot.style.background = color;
  statusDot.style.color = color;
  resultBox.classList.remove('empty');
  resultBox.innerHTML = `
    <h2 style="color:${color}">${escapeHtml(report.verdict)} / ${report.risk_score}</h2>
    <p>${escapeHtml(report.ai_analysis?.executive_summary || report.breakdown?.[0] || 'Review recommended.')}</p>
    <div>
      ${(report.score_trace || []).slice(0, 3).map((item) => `<span class="pill" style="color:${getScoreColor(item.impact)}">+${item.impact} ${escapeHtml(item.label)}</span>`).join('')}
    </div>
    <p><strong>Next:</strong> ${escapeHtml(report.safe_steps?.[0] || 'Use official channels before interacting.')}</p>
  `;
}

function renderStatus(text, tone) {
  const color = tone === 'danger' ? 'var(--danger)' : tone === 'safe' ? 'var(--safe)' : 'var(--warn)';
  statusDot.style.background = color;
  statusDot.style.color = color;
  resultBox.classList.add('empty');
  resultBox.innerHTML = `<p>${escapeHtml(text)}</p>`;
}

function getScoreColor(score) {
  if (score >= 70) return 'var(--danger)';
  if (score >= 35) return 'var(--warn)';
  return 'var(--safe)';
}

function normalizeApiBase(value) {
  return (value || DEFAULT_API_BASE).replace(/\/+$/, '');
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
