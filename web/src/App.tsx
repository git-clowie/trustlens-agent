import React, { useState, useEffect } from 'react';

// API configuration
declare global {
  interface Window {
    TRUSTLENS_CONFIG?: {
      API_BASE?: string;
      SHOW_PROVIDER_SETTINGS?: boolean;
    };
  }
}

const configuredApiBase = window.TRUSTLENS_CONFIG?.API_BASE || import.meta.env.VITE_API_BASE || '';
const urlParams = new URLSearchParams(window.location.search);
const DEFAULT_API_BASE = normalizeApiBase(configuredApiBase || (import.meta.env.DEV ? 'http://127.0.0.1:8000' : ''));
const SHOW_PROVIDER_SETTINGS = window.TRUSTLENS_CONFIG?.SHOW_PROVIDER_SETTINGS ?? import.meta.env.DEV;
const PROVIDER_SETTINGS_ENABLED = SHOW_PROVIDER_SETTINGS || urlParams.has('settings');
const HISTORY_KEY = 'trustlens_case_history_v2';
const API_BASE_STORAGE_KEY = 'trustlens_api_base_v1';
const OFFLINE_DEMO_STORAGE_KEY = 'trustlens_offline_demo_v1';
const DEFAULT_OPENROUTER_MODEL = 'google/gemma-4-31b-it';

// Predefined samples matching backend CLI
const SAMPLES = {
  courier: {
    source: 'SMS',
    situation: 'before_click',
    text: 'DHL Express: your parcel has an unpaid customs fee of $3.49. Pay now at http://dhl.customs-fee-handling.xyz/portal to avoid return.'
  },
  bank: {
    source: 'Email',
    situation: 'before_click',
    text: 'PayPal Security: a new sign-in was blocked. Verify your account within 30 minutes at https://paypal-security-center.live/login.'
  },
  lottery: {
    source: 'Email',
    situation: 'before_click',
    text: 'Congratulations! Your email john.doe@gmail.com won a $50,000 Google Rewards prize. Reply with your phone +1 202 555 0148 and SSN 123-45-6789 to claim.'
  },
  romance: {
    source: 'Chat',
    situation: 'clicked_only',
    text: 'Hello dear, I am trying to visit you next week but I do not have money for the visa fee. Please send $300 to my account. I love you so much and cannot wait!'
  }
};

const SCREENSHOT_FIXTURES = {
  bank: {
    label: 'Bank Screen',
    preview: '/fixtures/screenshots/bank-alert.svg',
    marker: 'TRUSTLENS_FIXTURE_BANK_SCREENSHOT',
    situation: 'before_click',
  },
  lottery: {
    label: 'Prize Screen',
    preview: '/fixtures/screenshots/lottery-claim.svg',
    marker: 'TRUSTLENS_FIXTURE_LOTTERY_SCREENSHOT',
    situation: 'before_click',
  },
  qr: {
    label: 'QR Screen',
    preview: '/fixtures/screenshots/qr-login.svg',
    marker: 'TRUSTLENS_FIXTURE_QR_SCREENSHOT',
    situation: 'clicked_only',
  },
};

interface TraceStep {
  step: string;
  status: 'running' | 'completed' | 'pending';
  detail: string;
}

interface DomainReport {
  domain: string;
  risk_score: number;
  verdict: string;
  indicators: string[];
  detected_brands: string[];
}

interface ScoreTraceItem {
  label: string;
  impact: number;
  source: string;
  severity: string;
  evidence: string;
  calculation: string;
}

interface AiEvidence {
  signal: string;
  why_it_matters: string;
  severity: string;
}

interface AiAnalysis {
  provider: string;
  model: string;
  fallback_used: boolean;
  status: string;
  executive_summary: string;
  user_explanation: string;
  recommended_priority: string;
  evidence: AiEvidence[];
  questions: string[];
  next_actions: string[];
  confidence_note: string;
  fallback_reason?: string;
}

interface InvestigationReport {
  redacted_text: string;
  links: Array<{ original: string; domain: string }>;
  domain_reports: DomainReport[];
  social_engineering_indicators: Array<{ category: string; detail: string }>;
  verdict: string;
  risk_score: number;
  confidence: number;
  breakdown: string[];
  score_trace: ScoreTraceItem[];
  safe_steps: string[];
  ai_analysis: AiAnalysis;
  report_draft: string;
  trace: TraceStep[];
  adk_framework_loaded: boolean;
  extracted_text?: string | null;
}

interface CaseRecord {
  id: string;
  created_at: string;
  verdict: string;
  risk_score: number;
  confidence: number;
  situation: string;
  ai_route: string;
  domain_count: number;
  indicator_count: number;
  text_preview: string;
  report: InvestigationReport;
}

export default function App() {
  const [inputText, setInputText] = useState('');
  const [situation, setSituation] = useState('before_click');
  const [reportSituation, setReportSituation] = useState('before_click');
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showProviderSettings, setShowProviderSettings] = useState(false);
  const [report, setReport] = useState<InvestigationReport | null>(null);
  const [activeTrace, setActiveTrace] = useState<TraceStep[]>([]);
  const [healthStatus, setHealthStatus] = useState({ adk: false, keySet: false, openRouter: false, model: '', apiReachable: false });
  const [copySuccess, setCopySuccess] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [apiBase, setApiBase] = useState(loadStoredApiBase);
  const [apiBaseDraft, setApiBaseDraft] = useState(loadStoredApiBase);
  const [offlineDemoMode, setOfflineDemoMode] = useState(() => loadStoredBoolean(OFFLINE_DEMO_STORAGE_KEY));
  const [caseHistory, setCaseHistory] = useState<CaseRecord[]>([]);
  const [imageFile, setImageFile] = useState<string | null>(null);
  const [imagePayload, setImagePayload] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [reportTab, setReportTab] = useState<'plan' | 'analysis' | 'packet'>('plan');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(HISTORY_KEY);
      if (saved) setCaseHistory(JSON.parse(saved).slice(0, 8));
    } catch {
      setCaseHistory([]);
    }
  }, []);

  // Load health check on mount
  useEffect(() => {
    fetch(buildApiUrl(apiBase, '/api/health'))
      .then((res) => {
        if (!res.ok) throw new Error('Health check failed.');
        return res.json();
      })
      .then((data) => {
        setHealthStatus({
          adk: data.adk_available,
          keySet: data.api_key_set,
          openRouter: data.openrouter_key_set,
          model: data.openrouter_model || DEFAULT_OPENROUTER_MODEL,
          apiReachable: true
        });
      })
      .catch(() => {
        setHealthStatus((prev) => ({ ...prev, apiReachable: false }));
        console.warn("Could not reach backend health endpoint. Using local fallbacks.");
      });
  }, [apiBase]);

  const selectSample = (key: keyof typeof SAMPLES) => {
    const sample = SAMPLES[key];
    setInputText(sample.text);
    setSituation(sample.situation);
    setImageFile(null);
    setImagePayload(null);
    setMimeType(null);
    setReport(null);
    setActiveTrace([]);
    handleInvestigate(sample.text, null, null, sample.situation);
  };

  const selectImageSample = (type: keyof typeof SCREENSHOT_FIXTURES) => {
    const fixture = SCREENSHOT_FIXTURES[type];

    setImageFile(fixture.preview);
    setImagePayload(fixture.marker);
    setMimeType('image/svg+xml');
    setInputText('');
    setSituation(fixture.situation);
    setReport(null);
    setActiveTrace([]);
    handleInvestigate('', fixture.marker, 'image/svg+xml', fixture.situation);
  };

  const saveApiBase = () => {
    const nextBase = normalizeApiBase(apiBaseDraft.trim());
    setApiBase(nextBase);
    setApiBaseDraft(nextBase);
    try {
      window.localStorage.setItem(API_BASE_STORAGE_KEY, nextBase);
    } catch {
      // API base persistence is a convenience for static demo hosting.
    }
  };

  const resetApiBase = () => {
    setApiBase(DEFAULT_API_BASE);
    setApiBaseDraft(DEFAULT_API_BASE);
    try {
      window.localStorage.removeItem(API_BASE_STORAGE_KEY);
    } catch {
      // Ignore locked-down localStorage.
    }
  };

  const toggleOfflineDemoMode = () => {
    setOfflineDemoMode((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(OFFLINE_DEMO_STORAGE_KEY, String(next));
      } catch {
        // Ignore locked-down localStorage.
      }
      return next;
    });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMimeType(file.type);
    setReport(null);
    setActiveTrace([]);

    const reader = new FileReader();
    reader.onloadend = () => {
      const imageData = reader.result as string;
      setImageFile(imageData);
      setImagePayload(imageData);
      setInputText('');
    };
    reader.readAsDataURL(file);
  };

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageFile(null);
    setImagePayload(null);
    setMimeType(null);
    setInputText('');
  };

  const persistCase = (data: InvestigationReport, situationValue: string) => {
    const storedReport = sanitizeReportForHistory(data);
    const record: CaseRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      created_at: new Date().toISOString(),
      verdict: storedReport.verdict,
      risk_score: storedReport.risk_score,
      confidence: storedReport.confidence,
      situation: situationValue,
      ai_route: getAiRouteLabel(storedReport.ai_analysis),
      domain_count: storedReport.domain_reports?.length || 0,
      indicator_count: storedReport.social_engineering_indicators?.length || 0,
      text_preview: (storedReport.redacted_text || 'Screenshot analysis').slice(0, 140),
      report: storedReport,
    };

    setCaseHistory((prev) => {
      const next = [record, ...prev].slice(0, 8);
      try {
        window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {
        // Local history is a demo convenience; investigation results should still render.
      }
      return next;
    });
  };

  const openCase = (record: CaseRecord) => {
    setReport(record.report);
    setReportSituation(record.situation);
    setReportTab('plan');
    setInputText(record.report.redacted_text || '');
    setImageFile(null);
    setImagePayload(null);
    setMimeType(null);
    setActiveTrace(record.report.trace || []);
  };

  const clearHistory = () => {
    setCaseHistory([]);
    try {
      window.localStorage.removeItem(HISTORY_KEY);
    } catch {
      // Ignore localStorage restrictions in private or locked-down browsers.
    }
  };

  const handleInvestigate = async (
    overrideText?: string,
    overrideImage?: string | null,
    overrideMime?: string | null,
    overrideSituation?: string
  ) => {
    const textToScan = overrideText !== undefined ? overrideText : inputText;
    const imageToScan = overrideImage !== undefined ? overrideImage : (imagePayload || imageFile);
    const mimeToScan = overrideMime !== undefined ? overrideMime : mimeType;
    const situationToScan = overrideSituation !== undefined ? overrideSituation : situation;

    if (!textToScan.trim() && !imageToScan) return;

    setLoading(true);
    setReport(null);
    setReportSituation(situationToScan);
    setReportTab('plan');
    setCopySuccess(false);
    setShareSuccess(false);

    // Initialize visual trace
    const initialTrace: TraceStep[] = [];
    if (imageToScan) {
      initialTrace.push({ step: 'Multimodal Vision OCR', status: 'running', detail: 'Decoding screenshot and transcribing text via Gemini Vision...' });
      initialTrace.push({ step: 'PII Redaction', status: 'pending', detail: 'Waiting to scan text for sensitive information...' });
    } else {
      initialTrace.push({ step: 'PII Redaction', status: 'running', detail: 'Scanning text for sensitive information (names, emails, cards)...' });
    }
    initialTrace.push(
      { step: 'Link Extraction', status: 'pending', detail: 'Waiting to parse message links...' },
      { step: 'Domain Inspection', status: 'pending', detail: 'Waiting to analyze destination threat patterns...' },
      { step: 'Threat Intelligence Check', status: 'pending', detail: 'Waiting to review social engineering heuristics...' },
      { step: 'Risk Synthesis', status: 'pending', detail: 'Waiting to compile risk score...' },
      { step: 'Safety Planner', status: 'pending', detail: 'Waiting to assemble recommendations...' },
      { step: 'Gemma Analyst', status: 'pending', detail: 'Waiting to enrich the evidence summary...' },
      { step: 'Incident Report Generator', status: 'pending', detail: 'Waiting to draft incident documentation...' },
      { step: 'Safety Review Guardrail', status: 'pending', detail: 'Waiting for guardrail validation...' }
    );
    setActiveTrace(initialTrace);

    try {
      const response = await fetch(buildApiUrl(apiBase, '/api/investigate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: textToScan, 
          situation: situationToScan,
          image: imageToScan,
          mime_type: mimeToScan,
          demo_offline: offlineDemoMode
        })
      });

      if (!response.ok) throw new Error('API Request failed.');

      const data: InvestigationReport = await response.json();
      if (data.extracted_text) setInputText(data.extracted_text);

      // Play trace
      for (let i = 0; i < data.trace.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 350));
        setActiveTrace((prev) => {
          const next = [...prev];
          if (next[i]) next[i] = { ...data.trace[i], status: 'completed' };
          if (next[i + 1]) next[i + 1].status = 'running';
          return next;
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
      setReport(data);
      persistCase(data, situationToScan);
    } catch (err) {
      console.error(err);
      const demoReport = buildClientDemoReport(textToScan, situationToScan, typeof imageToScan === 'string' ? imageToScan : null);
      if (demoReport.extracted_text) setInputText(demoReport.extracted_text);
      setActiveTrace(demoReport.trace);
      setReport(demoReport);
      persistCase(demoReport, situationToScan);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!report) return;
    const copied = await copyTextToClipboard(report.report_draft);
    if (copied) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleCopySummary = async () => {
    if (!report) return;
    const copied = await copyTextToClipboard(buildShareSummary(report, reportSituation));
    if (copied) {
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
    }
  };

  const handleExportJson = () => {
    if (!report) return;

    const payload = {
      exported_at: new Date().toISOString(),
      app: 'TrustLens Agent',
      situation: reportSituation,
      ai_route: getAiRouteLabel(report.ai_analysis),
      report,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `trustlens-case-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintPacket = () => {
    if (!report) return;
    window.print();
  };

  const resetWorkspace = () => {
    setReport(null);
    setInputText('');
    setImageFile(null);
    setImagePayload(null);
    setMimeType(null);
    setLoading(false);
    setActiveTrace([]);
    setShowHelp(false);
    setShowProviderSettings(false);
    setReportTab('plan');
  };

  // State machine derivation
  const appState = loading ? 'analyzing' : (report ? 'result' : 'idle');

  return (
    <div className="app-container">
      {/* HEADER SECTION (Navbar) */}
      <header>
        <div
          className="logo-section logo-reset"
          role="button"
          tabIndex={0}
          aria-label="Reset TrustLens workspace"
          onClick={resetWorkspace}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              resetWorkspace();
            }
          }}
        >
          <h1 className="brand-title">
            <span className="brand-mark" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" opacity="0.2" fill="currentColor"/>
                <circle cx="12" cy="12" r="3" fill="currentColor" />
                <path d="M12 9a3 3 0 0 0-3 3" stroke="#fff" strokeWidth="1" />
              </svg>
            </span>
            <span className="brand-wordmark">TrustLens</span>
          </h1>
        </div>
        <div className="status-bar">
          {offlineDemoMode && (
            <span className="badge" style={{ color: 'var(--color-warning)' }}>
              <span className="status-dot inactive"></span>
              Offline Demo
            </span>
          )}
          {PROVIDER_SETTINGS_ENABLED && (
            <button className="badge" onClick={() => setShowProviderSettings(true)} style={{ cursor: 'pointer', background: 'var(--panel-bg)', color: 'var(--text-secondary)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06A2 2 0 1 1 7.03 3.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.2.4.6.8 1 1 .34.19.72.3 1.1.3H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51.7z"/></svg>
              Provider
            </button>
          )}
          <button className="badge" onClick={() => setShowHelp(true)} style={{ cursor: 'pointer', background: 'var(--panel-bg)', color: 'var(--accent-primary)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            App Info
          </button>
        </div>
      </header>

      <div className="main-content">
        
        {/* IDLE STATE (HERO) */}
        {appState === 'idle' && (
          <>
            <div className="panel home-panel">
              <h3 className="panel-title home-title">
                Analyze a Suspicious Message
              </h3>
            
            <div className="omnibox">
              {imageFile ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2.5rem', gap: '1.5rem', position: 'relative' }}>
                  <img 
                    src={getImagePreviewSrc(imageFile, mimeType)}
                    style={{ maxHeight: '190px', maxWidth: '100%', borderRadius: '0.5rem', boxShadow: 'var(--shadow-md)' }}
                    alt="Uploaded threat"
                  />
                  <button 
                    onClick={clearImage}
                    className="btn btn-secondary"
                    style={{ position: 'absolute', top: '1rem', right: '1rem', padding: '0.5rem', fontSize: '0.75rem', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Remove Image"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ) : (
                <>
                  <textarea 
                    value={inputText}
                    onChange={handleTextChange}
                    placeholder="Paste the suspicious SMS, email body, or chat message here..."
                    style={{ width: '100%', minHeight: '180px', padding: '1.5rem', background: 'transparent', border: 'none', resize: 'vertical', color: 'var(--text-primary)', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}
                    title="Message content"
                  />
                  <div className="omnibox-toolbar">
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Or upload screenshot:</span>
                    <div style={{ position: 'relative' }}>
                      <button className="btn btn-secondary has-tooltip" data-tooltip="Analyze a screenshot instead of text" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', pointerEvents: 'none' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.25rem', verticalAlign: 'text-bottom' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        Browse Image
                      </button>
                      <input type="file" accept="image/*" onChange={handleImageUpload} title="Upload image file" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }}/>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="status-selector">
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>Select Status to Improve Accuracy</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setSituation('before_click')} 
                  title="Choose this if you have not clicked or replied yet."
                  style={{ flex: '1 1 120px', padding: '0.6rem', fontSize: '0.75rem', borderColor: situation === 'before_click' ? 'var(--accent-primary)' : 'var(--panel-border)', color: situation === 'before_click' ? 'var(--text-primary)' : 'var(--text-muted)', background: situation === 'before_click' ? 'rgba(0, 242, 254, 0.05)' : 'rgba(255,255,255,0.02)' }}
                >Not Clicked</button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setSituation('clicked_only')} 
                  title="Choose this if you opened the link but did not share data."
                  style={{ flex: '1 1 120px', padding: '0.6rem', fontSize: '0.75rem', borderColor: situation === 'clicked_only' ? 'var(--accent-primary)' : 'var(--panel-border)', color: situation === 'clicked_only' ? 'var(--text-primary)' : 'var(--text-muted)', background: situation === 'clicked_only' ? 'rgba(0, 242, 254, 0.05)' : 'rgba(255,255,255,0.02)' }}
                >Clicked Link</button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setSituation('compromised')} 
                  title="Choose this if you entered credentials, payment, or personal data."
                  style={{ flex: '1 1 120px', padding: '0.6rem', fontSize: '0.75rem', borderColor: situation === 'compromised' ? 'var(--accent-primary)' : 'var(--panel-border)', color: situation === 'compromised' ? 'var(--text-primary)' : 'var(--text-muted)', background: situation === 'compromised' ? 'rgba(0, 242, 254, 0.05)' : 'rgba(255,255,255,0.02)' }}
                >Data Shared</button>
              </div>
            </div>

            <button 
              className="btn btn-primary"
              onClick={() => handleInvestigate()}
              disabled={!inputText.trim() && !imageFile}
              title="Run the TrustLens security pipeline."
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              Analyze Message
            </button>

            {/* Quick Samples */}
            <div className="sample-section">
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Try a sample case:</span>
              <div className="sample-grid">
                <button className="btn btn-secondary sample-btn primary-sample" data-tooltip="High-risk parcel fee SMS" title="Load the DHL parcel fee SMS sample." onClick={() => selectSample('courier')}>DHL SMS</button>
                <button className="btn btn-secondary sample-btn" data-tooltip="Account verification phishing email" title="Load the PayPal account alert sample." onClick={() => selectSample('bank')}>PayPal Alert</button>
                {Object.entries(SCREENSHOT_FIXTURES).map(([key, fixture]) => (
                  <button key={key} className="btn btn-secondary sample-btn" data-tooltip="Load a synthetic screenshot fixture" title={`Load the ${fixture.label.toLowerCase()} fixture.`} onClick={() => selectImageSample(key as keyof typeof SCREENSHOT_FIXTURES)}>
                    {fixture.label}
                  </button>
                ))}
              </div>
              </div>
            </div>

            {caseHistory.length > 0 && (
              <div className="panel" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <h3 className="panel-title" style={{ marginBottom: 0 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 14l3-3 4 4 5-8"/></svg>
                    Case History
                  </h3>
                  <button className="btn btn-secondary" onClick={clearHistory} style={{ padding: '0.5rem 0.85rem', fontSize: '0.75rem' }}>
                    Clear
                  </button>
                </div>
                <div className="info-list">
                  {caseHistory.map((item) => (
                    <button
                      key={item.id}
                      className="info-item"
                      onClick={() => openCase(item)}
                      style={{ width: '100%', textAlign: 'left', cursor: 'pointer', color: 'var(--text-primary)' }}
                    >
                      <span style={{ width: '4px', alignSelf: 'stretch', borderRadius: '999px', background: getScoreColor(item.risk_score), flexShrink: 0 }}></span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '0.4rem' }}>
                          <strong style={{ fontFamily: 'var(--font-mono)', color: getScoreColor(item.risk_score), fontSize: '0.85rem' }}>
                            {item.verdict} / {item.risk_score}
                          </strong>
                          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                            {formatCaseTime(item.created_at)}
                          </span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', overflowWrap: 'anywhere' }}>{item.text_preview}</p>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                          <span>{getSituationLabel(item.situation)}</span>
                          <span>{item.domain_count} domains</span>
                          <span>{item.indicator_count} signals</span>
                          <span>{item.ai_route}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ANALYZING STATE (LOADING) */}
        {appState === 'analyzing' && (
          <div className="panel" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', marginBottom: '2.5rem', textAlign: 'center' }}>
              <div className="spinner" style={{ width: '48px', height: '48px', borderColor: 'var(--panel-border)', borderTopColor: 'var(--accent-primary)', borderWidth: '4px' }}></div>
              <div>
                <h3 className="panel-title" style={{ justifyContent: 'center', marginBottom: '0.5rem', fontSize: '1.5rem' }}>Investigation in Progress</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Analyzing vectors, extracting context, and running TrustLens security heuristics...</p>
              </div>
            </div>
            
            <div className="timeline-container">
              {activeTrace.map((step, idx) => (
                <div key={idx} className="timeline-step">
                  <div className="timeline-icon">
                    {step.status === 'completed' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-safe)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                    {step.status === 'running' && <div className="spinner" style={{ width: '16px', height: '16px', borderColor: 'var(--panel-border)', borderTopColor: 'var(--accent-primary)' }}></div>}
                    {step.status === 'pending' && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--panel-border-focus)', margin: '6px' }}></div>}
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-name" style={{ color: step.status === 'pending' ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                      {step.step}
                    </div>
                    <div className="timeline-detail" style={{ color: step.status === 'pending' ? 'var(--panel-border)' : 'var(--text-secondary)' }}>
                      {step.detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RESULT STATE (DASHBOARD) */}
        {appState === 'result' && report && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', animation: 'none' }}>
            
            {/* At a Glance (Full-width top section) */}
            <div className="panel full-width at-a-glance-panel">
              <div className="at-a-glance-grid">
                
                {/* Status Column */}
                <div className="status-col">
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>Security Review</h2>
                  <div className={`verdict-badge ${report.verdict.toLowerCase()}`}>
                    {report.verdict} Risk
                  </div>
                  <div className="status-meta">
                    <div className="status-meta-item">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      <span>Confidence: <strong>{report.confidence}%</strong></span>
                    </div>
                    <div className="status-meta-item">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>Analyst: <strong style={{ color: report.ai_analysis?.fallback_used ? 'var(--color-warning)' : 'var(--accent-primary)' }}>{getAiRouteLabel(report.ai_analysis)}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Score & Signatures Column */}
                <div className="score-col">
                  <div className="gauge-container threat-gauge" aria-label={`Risk score ${report.risk_score} out of 100`}>
                    <svg width="112" height="112" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--panel-bg-hover)" strokeWidth="3" />
                      {/* Glow Layer */}
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={getScoreColor(report.risk_score)} strokeDasharray={`${report.risk_score}, 100`} strokeWidth="5.5" strokeLinecap="round" style={{ opacity: 0.18, transition: 'stroke-dasharray 1s ease-out' }} />
                      {/* Main Stroke */}
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={getScoreColor(report.risk_score)} strokeDasharray={`${report.risk_score}, 100`} strokeWidth="3.2" strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease-out' }} />
                    </svg>
                    <div className="gauge-val" style={{ color: getScoreColor(report.risk_score) }}>
                      {report.risk_score}
                      <span>Risk score</span>
                    </div>
                  </div>
                  <div className="signatures-summary">
                    <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.1rem' }}>Signatures</span>
                    {report.breakdown.slice(0, 3).map((item, idx) => {
                      const cleanItem = item.trim().replace(/^["']+|["']+$/g, '').replace(/^\[+|\]+$/g, '');
                      return (
                        <div key={idx} className="signature-mini-tag" title={cleanItem}>
                          {getBreakdownIcon(cleanItem, getScoreColor(report.risk_score))}
                          <span>{cleanItem}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Urgent Action Column */}
                <div className="action-col">
                  <div className="report-action-card">
                    <span style={{ color: getScoreColor(report.risk_score), fontSize: '0.68rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      Immediate Next Move
                    </span>
                    <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>{report.safe_steps?.[0] || 'Use official channels.'}</strong>
                  </div>
                </div>

              </div>
            </div>

            {/* Tabbed details view */}
            <div style={{ width: '100%' }}>
              <div className="report-tabs">
                <button className={`tab-btn ${reportTab === 'plan' ? 'active' : ''}`} onClick={() => setReportTab('plan')} title="View the recovery or prevention steps.">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                  Action Plan
                </button>
                <button className={`tab-btn ${reportTab === 'analysis' ? 'active' : ''}`} onClick={() => setReportTab('analysis')} title="View evidence, model analysis, domains, and score trace.">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>
                  Threat Analytics
                </button>
                <button className={`tab-btn ${reportTab === 'packet' ? 'active' : ''}`} onClick={() => setReportTab('packet')} title="Copy, export, or print the compact case packet.">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                  Official Case Packet
                </button>
              </div>

              <div style={{ marginTop: '1.25rem' }}>
                
                {/* TAB 1: ACTION PLAN */}
                {reportTab === 'plan' && (
                  <div className="panel">
                    <h3 className="panel-title">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-safe)" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                      Contextual Action Plan
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Customized for: <strong style={{ color: 'var(--text-primary)' }}>{getSituationLabel(reportSituation)}</strong></p>
                    <div>
                      {report.safe_steps.map((step, idx) => {
                        const cleanStep = step.replace(/^\u26a0\ufe0f\s*|\u274c\s*|\u2611\ufe0f\s*|\u26a1\ufe0f\s*/, '').replace(/\*\*/g, '');
                        return (
                          <div key={idx} className="step-card">
                            <div className="step-icon-wrapper">
                              {getStepIcon(step)}
                            </div>
                            <div className="step-content">
                              <div className="step-number">Step {idx + 1}</div>
                              <div className="step-text">{cleanStep}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TAB 2: THREAT ANALYTICS */}
                {reportTab === 'analysis' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {report.ai_analysis && (
                      <div className="panel">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                          <h3 className="panel-title" style={{ marginBottom: 0 }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                            Gemma AI Analyst
                          </h3>
                          <span className="badge" style={{ color: report.ai_analysis.fallback_used ? 'var(--color-warning)' : 'var(--accent-primary)', flexShrink: 0 }}>
                            {report.ai_analysis.fallback_used ? 'Local Fallback' : 'Gemma Active'}
                          </span>
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: getPriorityColor(report.ai_analysis.recommended_priority), textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                          Priority: {report.ai_analysis.recommended_priority || 'review'}
                        </div>
                        <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1.05rem', lineHeight: 1.5 }}>
                          {report.ai_analysis.executive_summary}
                        </p>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '0.75rem', fontSize: '0.9rem', lineHeight: 1.6 }}>
                          {report.ai_analysis.user_explanation}
                        </p>
                        {report.ai_analysis.confidence_note && (
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '1rem', fontFamily: 'var(--font-mono)' }}>
                            {report.ai_analysis.confidence_note}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="dashboard-grid">
                      {/* Left Sub-Column */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="panel">
                          <h3 className="panel-title">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 16V9"/><path d="M12 16V5"/><path d="M17 16v-3"/></svg>
                            Evidence Metrics
                          </h3>
                          <div className="metric-grid">
                            {getEvidenceStats(report).map((stat) => (
                              <div key={stat.label} className="metric-item">
                                <span className="metric-label">{getMetricIcon(stat.label, stat.color)} {stat.label}</span>
                                <strong className="metric-value" style={{ color: stat.color }}>{stat.value}</strong>
                                <span className="metric-note">{stat.note}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="panel">
                          <h3 className="panel-title">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                            Redacted Input Content
                          </h3>
                          <div className="redacted-view" style={{ fontSize: '0.82rem' }}>
                            {report.redacted_text}
                          </div>
                        </div>
                      </div>

                      {/* Right Sub-Column */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {report.score_trace?.length > 0 && (
                          <div className="panel">
                            <h3 className="panel-title">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" strokeWidth="2"><path d="M3 3v18h18"/><path d="M7 14l3-3 4 4 5-8"/><circle cx="7" cy="14" r="1.5"/><circle cx="10" cy="11" r="1.5"/><circle cx="14" cy="15" r="1.5"/><circle cx="19" cy="7" r="1.5"/></svg>
                              Trace Log
                            </h3>
                            <div className="score-trace-list">
                              {report.score_trace.slice(0, 4).map((item, idx) => (
                                <div key={`${item.label}-${idx}`} className="score-trace-item">
                                  <div className="score-trace-topline">
                                    <strong>{item.label}</strong>
                                    <span style={{ color: getTraceColor(item) }}>+{item.impact}</span>
                                  </div>
                                  <div className="score-trace-bar" aria-hidden="true">
                                    <span style={{ width: `${Math.min(Math.max(item.impact, 4), 100)}%`, background: getTraceColor(item) }}></span>
                                  </div>
                                  <p style={{ fontSize: '0.78rem' }}>{item.evidence}</p>
                                  <small style={{ fontSize: '0.62rem' }}>{item.source.replace(/_/g, ' ')} - {item.calculation}</small>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {report.domain_reports && report.domain_reports.length > 0 && (
                          <div className="panel">
                            <h3 className="panel-title">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                              Domain Security Audit
                            </h3>
                            <div className="info-list">
                              {report.domain_reports.map((dom, i) => (
                                <div key={i} className="info-item" style={{ flexDirection: 'column', gap: '0.4rem', width: '100%', padding: '0.8rem' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 500, fontSize: '0.85rem' }}>{dom.domain}</span>
                                    <span style={{ fontSize: '0.82rem', color: getScoreColor(dom.risk_score), fontWeight: 700 }}>{dom.risk_score}/100</span>
                                  </div>
                                  {dom.indicators.map((ind, j) => (
                                    <div key={j} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.4rem' }}>
                                      <span style={{ color: 'var(--color-warning)' }}>-</span> {ind}
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                )}

                {/* TAB 3: INCIDENT REPORT CASE PACKET */}
                {reportTab === 'packet' && (
                  <div className="panel report-pack">
                    <div className="report-pack-header">
                      <h3 className="panel-title" style={{ marginBottom: 0 }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                        Official Case Packet
                      </h3>
                      <div className="report-actions">
                        <button className="btn btn-secondary" onClick={handleCopy} title="Copy the full sanitized report." style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                          {copySuccess ? 'Copied!' : 'Copy Report'}
                        </button>
                        <button className="btn btn-secondary" onClick={handleCopySummary} title="Copy a short shareable summary." style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>
                          {shareSuccess ? 'Copied!' : 'Copy Summary'}
                        </button>
                        <button className="btn btn-secondary" onClick={handleExportJson} title="Export the full structured JSON evidence." style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M10 13l-2 2 2 2"/><path d="M14 13l2 2-2 2"/></svg>
                          Export JSON
                        </button>
                        <button className="btn btn-secondary" onClick={handlePrintPacket} title="Open the browser print dialog for PDF export." style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                          Print PDF
                        </button>
                      </div>
                    </div>

                    <div className="report-summary-grid packet-summary-grid">
                      <div className="report-summary-item">
                        <span>Risk</span>
                        <strong style={{ color: getScoreColor(report.risk_score) }}>{report.verdict} / {report.risk_score}</strong>
                      </div>
                      <div className="report-summary-item">
                        <span>Context</span>
                        <strong>{getSituationLabel(reportSituation)}</strong>
                      </div>
                      <div className="report-summary-item">
                        <span>Evidence</span>
                        <strong>{getPrimaryEvidence(report)}</strong>
                      </div>
                      <div className="report-summary-item">
                        <span>AI Analyst</span>
                        <strong>{getAiRouteLabel(report.ai_analysis)}</strong>
                      </div>
                    </div>

                    <div className="report-chip-row">
                      {getTopScoreContributors(report).map((item, idx) => (
                        <span key={`${item.label}-${idx}`} className="report-chip" style={{ borderColor: getTraceColor(item), color: getTraceColor(item), background: `${getTraceColor(item)}12` }}>
                          +{item.impact} {item.label}
                        </span>
                      ))}
                    </div>

                    <div className="report-preview-container">
                      <div className="report-preview-header">
                        <div className="report-preview-title">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4"/><path d="M21 12c.552 0 1-.448 1-1V5c0-.552-.448-1-1-1H3c-.552 0-1 .448-1 1v6c0 .552.448 1 1 1"/><path d="M3 12v7c0 .552.448 1 1 1h16c.552 0 1-.448 1-1v-7"/></svg>
                          <span>Report Draft</span>
                        </div>
                        <span className="window-title">Sanitized case packet</span>
                      </div>
                      <pre className="redacted-view report-preview">
                        {report.report_draft}
                      </pre>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Back button */}
            <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => { setReport(null); setInputText(''); setImageFile(null); setImagePayload(null); setMimeType(null); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                Analyze Another Message
              </button>
            </div>

          </div>
        )}

      </div>

      {/* HELP MODAL */}
      {showHelp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', padding: '1rem' }}>
          <div className="panel" style={{ maxWidth: '600px', width: '100%', position: 'relative', margin: '0', borderTop: '2px solid var(--accent-primary)', borderBottom: '2px solid var(--accent-secondary)' }}>
            <button onClick={() => setShowHelp(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--panel-border)', borderRadius: '4px', padding: '4px', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <h3 className="panel-title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', color: 'var(--accent-primary)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              How to use TrustLens
            </h3>
            
            <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.5rem', fontSize: '1rem' }}>1. Submit a Suspicious Message</strong>
                <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5' }}>Paste any suspicious SMS, email, or chat message into the console. Alternatively, you can upload a screenshot of the message directly and our AI will read the text.</p>
              </div>

              <div>
                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.5rem', fontSize: '1rem' }}>2. Specify the Context</strong>
                <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5' }}>Let us know if you haven't clicked anything yet (Prevention), if you just clicked the link (Inspection), or if you already shared data (Recovery). We'll tailor the plan accordingly.</p>
              </div>

              <div>
                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.5rem', fontSize: '1rem' }}>3. Get Actionable Intelligence</strong>
                <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5' }}>Review the risk score, the exact social engineering techniques used, and follow the step-by-step contextual action plan to secure your data.</p>
              </div>
            </div>

            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <strong style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>System Architecture</strong>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                <span>Gemini Vision OCR</span>
                <span>OpenRouter Gemma Analyst</span>
                <span>Google ADK</span>
                <span>MCP Tool Server</span>
                <span>Local Guardrails</span>
              </div>
            </div>

            <div style={{ marginTop: '2.5rem', textAlign: 'center', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              <span style={{ color: 'var(--text-muted)' }}>Built by </span>
              <a href="https://pixek.xyz" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-secondary)', textDecoration: 'none', fontWeight: 700, textShadow: '0 0 10px rgba(139, 92, 246, 0.5)' }}>pixek.xyz</a>
            </div>
          </div>
        </div>
      )}

      {showProviderSettings && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', padding: '1rem' }}>
          <div className="panel" style={{ maxWidth: '680px', width: '100%', position: 'relative', margin: 0, borderTop: '2px solid var(--accent-secondary)' }}>
            <button onClick={() => setShowProviderSettings(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--panel-border)', borderRadius: '4px', padding: '4px', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <h3 className="panel-title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: 'var(--accent-secondary)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              Provider Settings
            </h3>

            <div className="settings-grid">
              <div className="settings-field full">
                <label htmlFor="api-base">API Base URL</label>
                <input
                  id="api-base"
                  value={apiBaseDraft}
                  onChange={(event) => setApiBaseDraft(event.target.value)}
                  placeholder="https://your-trustlens-api.example.com"
                />
              </div>

              <div className="settings-card">
                <span>Backend</span>
                <strong style={{ color: healthStatus.apiReachable ? 'var(--color-safe)' : 'var(--color-warning)' }}>
                  {healthStatus.apiReachable ? 'Connected' : 'Disconnected'}
                </strong>
              </div>
              <div className="settings-card">
                <span>OpenRouter</span>
                <strong style={{ color: healthStatus.openRouter && !offlineDemoMode ? 'var(--accent-primary)' : 'var(--color-warning)' }}>
                  {offlineDemoMode ? 'Demo Fallback' : healthStatus.openRouter ? 'Live' : 'Local Fallback'}
                </strong>
              </div>
              <div className="settings-card full">
                <span>Gemma Model</span>
                <strong>{healthStatus.model || DEFAULT_OPENROUTER_MODEL}</strong>
              </div>
            </div>

            <div className="settings-actions">
              <button className="btn btn-secondary" onClick={saveApiBase}>
                Save API
              </button>
              <button className="btn btn-secondary" onClick={resetApiBase}>
                Reset API
              </button>
              <button className="btn btn-secondary" onClick={toggleOfflineDemoMode} style={{ color: offlineDemoMode ? 'var(--color-warning)' : 'var(--text-secondary)' }}>
                Offline Demo: {offlineDemoMode ? 'On' : 'Off'}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="runtime-footer">
        <div className="runtime-strip" aria-label="Runtime status">
          <span className="runtime-pill" title={healthStatus.apiReachable ? 'Backend API is reachable.' : 'Backend API is not reachable from this browser.'}>
            <span className={`status-dot ${healthStatus.apiReachable ? 'active' : 'inactive'}`}></span>
            API {healthStatus.apiReachable ? 'connected' : 'offline'}
          </span>
          <span className="runtime-pill" title={healthStatus.model || DEFAULT_OPENROUTER_MODEL}>
            <span className={`status-dot ${healthStatus.openRouter && !offlineDemoMode ? 'active' : 'inactive'}`}></span>
            Gemma {offlineDemoMode ? 'demo' : healthStatus.openRouter ? 'live' : 'fallback'}
          </span>
          <span className="runtime-pill" title="Screenshot OCR uses Gemini when configured, otherwise deterministic demo fixtures.">
            <span className={`status-dot ${healthStatus.keySet && !offlineDemoMode ? 'active' : 'inactive'}`}></span>
            OCR {offlineDemoMode ? 'demo' : healthStatus.keySet ? 'live' : 'fixtures'}
          </span>
          <span className="runtime-pill" title="Google ADK coordinator availability.">
            <span className={`status-dot ${healthStatus.adk ? 'active' : 'inactive'}`}></span>
            ADK {healthStatus.adk ? 'active' : 'fallback'}
          </span>
          <span className="runtime-pill" title="MCP server tools are included in the project.">
            <span className="status-dot active"></span>
            MCP ready
          </span>
        </div>
        <div className="footer-credit">
          Built by <a href="https://pixek.xyz" target="_blank" rel="noreferrer">pixek.xyz</a>
        </div>
      </footer>
    </div>
  );
}

// Helper colors
function normalizeApiBase(value: string) {
  return value.replace(/\/+$/, '');
}

function buildApiUrl(apiBase: string, path: string) {
  const normalizedBase = normalizeApiBase(apiBase);
  return normalizedBase ? `${normalizedBase}${path}` : path;
}

function loadStoredApiBase() {
  try {
    return window.localStorage.getItem(API_BASE_STORAGE_KEY) || DEFAULT_API_BASE;
  } catch {
    return DEFAULT_API_BASE;
  }
}

function loadStoredBoolean(key: string) {
  try {
    return window.localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

async function copyTextToClipboard(value: string) {
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);
  if (copied) return true;

  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function getImagePreviewSrc(value: string, mimeType?: string | null) {
  if (value.startsWith('data:') || value.startsWith('/') || value.startsWith('http')) return value;
  return `data:${mimeType || 'image/png'};base64,${value}`;
}

function buildClientDemoReport(rawText: string, situation: string, imageMarker?: string | null): InvestigationReport {
  const fixtureText = getClientFixtureText(imageMarker);
  const sourceText = (rawText || fixtureText || 'Suspicious message asks the recipient to verify account access through an unknown link.').trim();
  const lower = sourceText.toLowerCase();
  const redactedText = redactDemoText(sourceText);
  const links = extractDemoLinks(sourceText);
  const domain = links[0]?.domain || '';
  const isDhl = lower.includes('dhl');
  const isPaypal = lower.includes('paypal');
  const isFedex = lower.includes('fedex');
  const isPrize = lower.includes('prize') || lower.includes('rewards') || lower.includes('lottery');
  const isQr = lower.includes('qr') || lower.includes('microsoft');
  const brand = isDhl ? 'DHL' : isPaypal ? 'PAYPAL' : isFedex ? 'FEDEX' : isQr ? 'MICROSOFT' : isPrize ? 'GOOGLE' : 'UNKNOWN';
  const paymentHook = /pay|fee|customs|invoice|bank|card|money|\$|payment/.test(lower);
  const dataHook = /verify|confirm|login|password|account|identity|ssn|code|credential/.test(lower);
  const urgencyHook = /now|urgent|within|minutes|avoid|blocked|limited|expires|immediate/.test(lower);

  let score = 52;
  if (domain) score += 18;
  if (brand !== 'UNKNOWN') score += 16;
  if (paymentHook) score += 12;
  if (dataHook) score += 12;
  if (urgencyHook) score += 8;
  if (isDhl) score = 95;
  if (isPaypal) score = Math.max(score, 74);
  if (isFedex) score = Math.max(score, 86);
  if (isPrize) score = Math.max(score, 82);
  if (isQr) score = Math.max(score, 72);
  score = Math.min(score, 96);

  const verdict = score >= 70 ? 'High' : score >= 35 ? 'Medium' : 'Low';
  const domainRisk = domain ? Math.min(100, score + (domain.includes('.xyz') || domain.includes('.live') || domain.includes('.net') ? 5 : 0)) : 0;
  const breakdown = [
    domain ? 'Unsafe destination link detected.' : 'No clickable URL extracted from visible text.',
    brand !== 'UNKNOWN' ? 'Appears to impersonate a trusted company/institution.' : 'Sender identity cannot be verified from the message.',
    paymentHook ? 'Asks for immediate payment, bank details, or delivery fees.' : dataHook ? 'Requests account or identity verification.' : 'Uses persuasion language that needs independent verification.',
  ];
  const indicators = [
    ...(brand !== 'UNKNOWN' ? [{ category: 'Brand Impersonation', detail: `Claims to represent ${brand} while routing to an unverified destination.` }] : []),
    ...(paymentHook ? [{ category: 'Financial Request', detail: 'Mentions a payment, fee, prize, or transfer pressure.' }] : []),
    ...(dataHook ? [{ category: 'Data Collection Prompt', detail: 'Pushes the user toward account, identity, or credential confirmation.' }] : []),
    ...(urgencyHook ? [{ category: 'Urgency Pressure', detail: 'Uses time pressure or account consequences to rush action.' }] : []),
  ];
  const safeSteps = getClientSafeSteps(situation);
  const scoreTrace = [
    ...(domain ? [{
      label: 'Highest domain risk',
      impact: domainRisk,
      source: 'client_demo_domain_pattern',
      severity: domainRisk >= 70 ? 'high' : 'medium',
      evidence: `${domain}: unverified destination in a suspicious message.`,
      calculation: 'demo domain pattern score',
    }] : []),
    ...(brand !== 'UNKNOWN' ? [{
      label: 'Brand impersonation',
      impact: 16,
      source: 'client_demo_brand_signal',
      severity: 'medium',
      evidence: `Message claims to be from ${brand}.`,
      calculation: 'matched trusted brand signal',
    }] : []),
    ...(paymentHook ? [{
      label: 'Financial pressure',
      impact: 12,
      source: 'client_demo_social_signal',
      severity: 'medium',
      evidence: 'Payment, fee, prize, or transfer language detected.',
      calculation: 'social engineering hook',
    }] : []),
    ...(dataHook ? [{
      label: 'Data collection prompt',
      impact: 12,
      source: 'client_demo_privacy_signal',
      severity: 'medium',
      evidence: 'Message asks for verification, login, identity, or credential action.',
      calculation: 'credential/data hook',
    }] : []),
  ].slice(0, 4);

  const trace = [
    { step: imageMarker ? 'Screenshot Fixture OCR' : 'PII Redaction', status: 'completed' as const, detail: imageMarker ? 'Loaded deterministic screenshot fixture text in browser demo mode.' : 'Redacted sensitive values locally for browser demo mode.' },
    { step: 'Link Extraction', status: 'completed' as const, detail: domain ? `Found ${domain}.` : 'No URL extracted.' },
    { step: 'Domain Inspection', status: 'completed' as const, detail: domain ? 'Applied browser demo domain-pattern scoring.' : 'Skipped domain scoring because no URL was present.' },
    { step: 'Threat Intelligence Check', status: 'completed' as const, detail: 'Matched social-engineering demo signals.' },
    { step: 'Risk Synthesis', status: 'completed' as const, detail: `Assigned ${verdict} risk (${score}/100).` },
    { step: 'Safety Planner', status: 'completed' as const, detail: 'Generated contextual user-safe next steps.' },
    { step: 'Gemma Analyst', status: 'completed' as const, detail: 'Backend unavailable; browser demo fallback explanation attached.' },
    { step: 'Incident Report Generator', status: 'completed' as const, detail: 'Built a compact client-side demo case packet.' },
  ];

  const aiAnalysis: AiAnalysis = {
    provider: 'browser-demo',
    model: 'client-demo-fallback',
    fallback_used: true,
    status: 'fallback',
    recommended_priority: score >= 70 ? 'urgent' : 'review',
    executive_summary: `TrustLens classified this as ${verdict} risk (${score}/100) using browser demo evidence.`,
    user_explanation: 'The live API is unavailable from this static build, so this sample is rendered with deterministic demo evidence. Configure a backend API for live Gemma enrichment.',
    evidence: scoreTrace.slice(0, 3).map((item) => ({
      signal: item.label,
      why_it_matters: item.evidence,
      severity: item.severity,
    })),
    questions: ['Did you enter credentials, payment details, or personal information?', 'Can you verify the request through the official app or typed website?'],
    next_actions: safeSteps,
    confidence_note: 'Client-side demo fallback; use the FastAPI backend for production analysis and OpenRouter Gemma output.',
    fallback_reason: 'API unreachable or not configured for this browser session.',
  };

  const reportDraft = [
    'TRUSTLENS CASE PACKET',
    `Risk: ${verdict.toUpperCase()} (${score}/100)`,
    `Target brand: ${brand}`,
    `Signals: ${breakdown.join(', ')}`,
    'Privacy: User identifiers redacted before analysis',
    '',
    'First safe move:',
    safeSteps[0],
    '',
    'Anonymized suspicious content:',
    redactedText,
    '',
    'Analyst route: Browser Demo Fallback',
  ].join('\n');

  return {
    redacted_text: redactedText,
    links,
    domain_reports: domain ? [{
      domain,
      risk_score: domainRisk,
      verdict: domainRisk >= 70 ? 'High' : domainRisk >= 35 ? 'Medium' : 'Low',
      indicators: breakdown,
      detected_brands: brand === 'UNKNOWN' ? [] : [brand.toLowerCase()],
    }] : [],
    social_engineering_indicators: indicators,
    verdict,
    risk_score: score,
    confidence: imageMarker ? 92 : 90,
    breakdown,
    score_trace: scoreTrace,
    safe_steps: safeSteps,
    ai_analysis: aiAnalysis,
    report_draft: reportDraft,
    trace,
    adk_framework_loaded: false,
    extracted_text: imageMarker ? sourceText : null,
  };
}

function getClientFixtureText(imageMarker?: string | null) {
  const marker = (imageMarker || '').toUpperCase();
  if (marker.includes('BANK')) {
    return 'PayPal Security: Your account is temporarily limited. Confirm your identity at https://paypal-account-review.net/login within 30 minutes.';
  }
  if (marker.includes('LOTTERY')) {
    return 'Google Rewards: Congratulations, you won a $50,000 prize. Submit your phone number and SSN at https://google-rewards-claim.com/secure.';
  }
  if (marker.includes('QR')) {
    return 'Microsoft 365: Scan this QR code to keep mailbox access active. Confirm password at https://microsoft365-login-review.com.';
  }
  return '';
}

function extractDemoLinks(value: string) {
  const urls = value.match(/https?:\/\/[^\s)]+/gi) || [];
  return urls.map((original) => {
    try {
      return { original, domain: new URL(original).hostname.replace(/^www\./, '') };
    } catch {
      return { original, domain: original.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '') };
    }
  });
}

function redactDemoText(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[REDACTED_PHONE]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_ID]');
}

function getClientSafeSteps(situation: string) {
  if (situation === 'compromised') {
    return [
      'Change the affected password from the official website or app.',
      'Enable MFA and revoke suspicious sessions.',
      'Contact the official provider or bank support channel.',
      'Save the message, transaction details, and timestamps for reporting.',
    ];
  }
  if (situation === 'clicked_only') {
    return [
      'Close the page and do not enter any information.',
      'Run a quick device/browser security check.',
      'Change passwords only if you typed credentials.',
      'Verify the request through the official app or typed website.',
    ];
  }
  return [
    'DO NOT click any link in the message.',
    'Do not reply to the sender. Scammers often use replies to verify that a phone number or email is active.',
    'Verify independently: use the official website or official app by typing the address yourself.',
    'Report and delete: block the sender, mark it as spam, and remove the message.',
  ];
}

function getSituationLabel(sit: string) {
  if (sit === 'before_click') return 'Prevention (Not Clicked)';
  if (sit === 'clicked_only') return 'Inspection (Clicked Link)';
  if (sit === 'compromised') return 'Recovery (Data Shared)';
  return 'Standard Analysis';
}
function getScoreColor(score: number) {
  if (score >= 70) return 'var(--color-danger)';
  if (score >= 35) return 'var(--color-warning)';
  return 'var(--color-safe)';
}

function getPriorityColor(priority: string) {
  const normalized = (priority || '').toLowerCase();
  if (normalized === 'lockdown' || normalized === 'urgent' || normalized === 'high') return 'var(--color-danger)';
  if (normalized === 'caution' || normalized === 'medium') return 'var(--color-warning)';
  return 'var(--color-safe)';
}

function getAiRouteLabel(ai?: AiAnalysis) {
  if (!ai) return 'Local Rules';
  if (ai.fallback_used) return 'Local Fallback';
  return 'Live Gemma Analyst';
}

function getTraceColor(item: ScoreTraceItem) {
  if (item.severity === 'high' || item.impact >= 70) return 'var(--color-danger)';
  if (item.severity === 'medium' || item.impact >= 35) return 'var(--color-warning)';
  return 'var(--color-safe)';
}

function getPrimaryEvidence(report: InvestigationReport) {
  const topDomain = report.domain_reports?.slice().sort((a, b) => b.risk_score - a.risk_score)[0];
  if (topDomain) return topDomain.domain;
  const topIndicator = report.social_engineering_indicators?.[0];
  if (topIndicator) return topIndicator.category;
  return 'No major signal';
}

function getTopScoreContributors(report: InvestigationReport) {
  return (report.score_trace || [])
    .filter((item) => item.impact > 0)
    .slice()
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3);
}

function sanitizeReportForHistory(report: InvestigationReport): InvestigationReport {
  const redactedText = report.redacted_text || '[REDACTED_SCREENSHOT_TEXT]';

  return {
    ...report,
    redacted_text: redactedText,
    extracted_text: null,
    links: report.links?.map((link) => ({
      domain: link.domain,
      original: link.domain,
    })) || [],
  };
}

function getEvidenceStats(report: InvestigationReport) {
  const maxDomainRisk = report.domain_reports?.reduce((max, item) => Math.max(max, item.risk_score), 0) || 0;
  const highDomains = report.domain_reports?.filter((item) => item.verdict === 'High').length || 0;
  const aiLive = report.ai_analysis && !report.ai_analysis.fallback_used;

  return [
    {
      label: 'Links',
      value: String(report.links?.length || 0),
      note: `${highDomains} high-risk domains`,
      color: maxDomainRisk >= 70 ? 'var(--color-danger)' : maxDomainRisk >= 35 ? 'var(--color-warning)' : 'var(--color-safe)',
    },
    {
      label: 'Max Domain Risk',
      value: `${maxDomainRisk}/100`,
      note: 'offline domain pattern score',
      color: getScoreColor(maxDomainRisk),
    },
    {
      label: 'Social Hooks',
      value: String(report.social_engineering_indicators?.length || 0),
      note: 'urgency, money, brand, data prompts',
      color: report.social_engineering_indicators?.length >= 3 ? 'var(--color-danger)' : 'var(--color-warning)',
    },
    {
      label: 'Agent Trace',
      value: String(report.trace?.length || 0),
      note: 'auditable pipeline steps',
      color: 'var(--accent-primary)',
    },
    {
      label: 'AI Analyst',
      value: aiLive ? 'Live' : 'Fallback',
      note: getAiRouteLabel(report.ai_analysis),
      color: aiLive ? 'var(--accent-primary)' : 'var(--color-warning)',
    },
    {
      label: 'Confidence',
      value: `${report.confidence}%`,
      note: 'combined evidence confidence',
      color: getScoreColor(report.risk_score),
    },
  ];
}

function getMetricIcon(label: string, color: string) {
  const props = { width: 13, height: 13, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (label === 'Links') {
    return <svg {...props}><path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11 4.93"/><path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07L13 19.07"/></svg>;
  }
  if (label === 'Max Domain Risk') {
    return <svg {...props}><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 0 20"/><path d="M12 2a15.3 15.3 0 0 0 0 20"/></svg>;
  }
  if (label === 'Social Hooks') {
    return <svg {...props}><path d="M3 12h4l3 8 4-16 3 8h4"/></svg>;
  }
  if (label === 'Agent Trace') {
    return <svg {...props}><path d="M4 6h16"/><path d="M4 12h10"/><path d="M4 18h16"/><circle cx="18" cy="12" r="2"/></svg>;
  }
  if (label === 'AI Analyst') {
    return <svg {...props}><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 9h6v6H9z"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3"/></svg>;
  }
  return <svg {...props}><path d="M20 6 9 17l-5-5"/></svg>;
}

function getBreakdownIcon(text: string, color: string) {
  const normalized = text.toLowerCase();
  const props = { width: 13, height: 13, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, style: { flexShrink: 0 } };
  if (normalized.includes('link') || normalized.includes('destination')) {
    return <svg {...props}><path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11 4.93"/><path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07L13 19.07"/></svg>;
  }
  if (normalized.includes('urgency') || normalized.includes('threat')) {
    return <svg {...props}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>;
  }
  if (normalized.includes('impersonate') || normalized.includes('trusted')) {
    return <svg {...props}><path d="M12 3l8 4v5c0 5-3.4 8.7-8 9-4.6-.3-8-4-8-9V7l8-4z"/><path d="M9 12l2 2 4-4"/></svg>;
  }
  if (normalized.includes('payment') || normalized.includes('bank') || normalized.includes('fee')) {
    return <svg {...props}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M7 15h2"/></svg>;
  }
  if (normalized.includes('credential') || normalized.includes('code') || normalized.includes('data')) {
    return <svg {...props}><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
  }
  return <svg {...props}><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>;
}

function buildShareSummary(report: InvestigationReport, situation: string) {
  const domains = report.domain_reports?.map((item) => `${item.domain} (${item.risk_score}/100)`).join(', ') || 'none';
  const topEvidence = report.score_trace?.slice(0, 3).map((item) => `${item.label} +${item.impact}`).join('; ') || report.breakdown.join('; ');
  const actions = report.safe_steps?.slice(0, 3).map((step, idx) => `${idx + 1}. ${step}`).join('\n') || 'No actions generated.';

  return [
    `TrustLens risk summary`,
    `Verdict: ${report.verdict} (${report.risk_score}/100), confidence ${report.confidence}%`,
    `Context: ${getSituationLabel(situation)}`,
    `AI analyst: ${getAiRouteLabel(report.ai_analysis)}`,
    `Domains: ${domains}`,
    `Signals: ${report.breakdown.join('; ')}`,
    `Score trace: ${topEvidence}`,
    ``,
    `Recommended next actions:`,
    actions,
  ].join('\n');
}

function formatCaseTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Saved case';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getStepIcon(stepText: string) {
  const text = stepText.toLowerCase();
  if (text.includes("do not click") || text.includes("danger") || text.includes("not reply")) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    );
  }
  if (text.includes("verify") || text.includes("check")) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    );
  }
  if (text.includes("report") || text.includes("delete") || text.includes("block")) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
      </svg>
    );
  }
  if (text.includes("bank") || text.includes("card") || text.includes("freeze")) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    );
  }
  if (text.includes("password") || text.includes("credential") || text.includes("mfa") || text.includes("2fa")) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    );
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-safe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
