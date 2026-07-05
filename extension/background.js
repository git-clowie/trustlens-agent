const DEFAULT_API_BASE = 'http://127.0.0.1:8000';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'trustlens-analyze-selection',
    title: 'Analyze with TrustLens',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== 'trustlens-analyze-selection') return;

  const text = (info.selectionText || '').trim();
  if (!text) return;

  await chrome.storage.local.set({
    selectedText: text,
    lastStatus: 'Analyzing selected text...',
  });

  try {
    const { apiBase = DEFAULT_API_BASE, situation = 'before_click' } = await chrome.storage.local.get(['apiBase', 'situation']);
    const report = await analyzeText(apiBase, text, situation);
    await chrome.storage.local.set({
      lastReport: report,
      lastStatus: `TrustLens: ${report.verdict} (${report.risk_score}/100)`,
    });
    await chrome.action.setBadgeText({ text: String(report.risk_score) });
    await chrome.action.setBadgeBackgroundColor({ color: report.risk_score >= 70 ? '#ef4444' : report.risk_score >= 35 ? '#f59e0b' : '#10b981' });
  } catch (error) {
    await chrome.storage.local.set({
      lastStatus: `TrustLens error: ${error.message}`,
    });
    await chrome.action.setBadgeText({ text: '!' });
    await chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
  }
});

async function analyzeText(apiBase, text, situation) {
  const response = await fetch(`${normalizeApiBase(apiBase)}/api/investigate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, situation }),
  });

  if (!response.ok) {
    throw new Error(`API ${response.status}`);
  }

  return response.json();
}

function normalizeApiBase(value) {
  return (value || DEFAULT_API_BASE).replace(/\/+$/, '');
}
