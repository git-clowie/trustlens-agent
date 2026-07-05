import React, { useState, useEffect } from 'react';

// API configuration
const API_BASE = import.meta.env.DEV ? 'http://127.0.0.1:8000' : '';
const HISTORY_KEY = 'trustlens_case_history_v1';

// Predefined samples matching backend CLI
const SAMPLES = {
  courier: {
    source: 'SMS',
    situation: 'before_click',
    text: 'Dear DHL customer, your package has an outstanding customs fee of 14.99 RON. Please pay immediately at http://dhl.customs-fee-handling.xyz/portal to avoid return.'
  },
  bank: {
    source: 'SMS',
    situation: 'before_click',
    text: 'Banca Transilvania: Your account has been temporarily restricted. Log in urgently at https://bt-verificare-securizata.today/login to unlock it within 24 hours.'
  },
  lottery: {
    source: 'Email',
    situation: 'before_click',
    text: 'Dear winner! Your email john.doe@gmail.com won $50,000 in Google Anniversary Promo. Write to claim@google-rewards.xyz with your phone +40722334455 and SSN 1900101998877.'
  },
  romance: {
    source: 'Chat',
    situation: 'clicked_only',
    text: 'Hello dear, I am trying to visit you next week but I do not have money for the visa fee. Please send $300 to my account. I love you so much and cannot wait!'
  }
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
  const [report, setReport] = useState<InvestigationReport | null>(null);
  const [activeTrace, setActiveTrace] = useState<TraceStep[]>([]);
  const [healthStatus, setHealthStatus] = useState({ adk: false, keySet: false, openRouter: false, model: '' });
  const [copySuccess, setCopySuccess] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [caseHistory, setCaseHistory] = useState<CaseRecord[]>([]);
  const [imageFile, setImageFile] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);

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
    fetch(`${API_BASE}/api/health`)
      .then((res) => res.json())
      .then((data) => {
        setHealthStatus({
          adk: data.adk_available,
          keySet: data.api_key_set,
          openRouter: data.openrouter_key_set,
          model: data.openrouter_model || 'google/gemma-4-31b-it:free'
        });
      })
      .catch(() => {
        console.warn("Could not reach backend health endpoint. Using local fallbacks.");
      });
  }, []);

  const selectSample = (key: keyof typeof SAMPLES) => {
    const sample = SAMPLES[key];
    setInputText(sample.text);
    setSituation(sample.situation);
    setImageFile(null);
    setMimeType(null);
    setReport(null);
    setActiveTrace([]);
    handleInvestigate(sample.text, null, null, sample.situation);
  };

  const selectImageSample = (type: 'bank' | 'courier') => {
    const mockBase64 = type === 'bank' 
      ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=MOCK_BANK_SCREENSHOT'
      : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=MOCK_COURIER_SCREENSHOT';
      
    setImageFile(mockBase64);
    setMimeType('image/png');
    setInputText('');
    setSituation('before_click');
    setReport(null);
    setActiveTrace([]);
    handleInvestigate('', mockBase64, 'image/png', 'before_click');
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
      setImageFile(reader.result as string);
      setInputText('');
    };
    reader.readAsDataURL(file);
  };

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageFile(null);
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
    setInputText(record.report.redacted_text || '');
    setImageFile(null);
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
    const imageToScan = overrideImage !== undefined ? overrideImage : imageFile;
    const mimeToScan = overrideMime !== undefined ? overrideMime : mimeType;
    const situationToScan = overrideSituation !== undefined ? overrideSituation : situation;

    if (!textToScan.trim() && !imageToScan) return;

    setLoading(true);
    setReport(null);
    setReportSituation(situationToScan);
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
      { step: 'Gemma 4 Analyst', status: 'pending', detail: 'Waiting to enrich the evidence summary...' },
      { step: 'Incident Report Generator', status: 'pending', detail: 'Waiting to draft incident documentation...' },
      { step: 'Safety Review Guardrail', status: 'pending', detail: 'Waiting for guardrail validation...' }
    );
    setActiveTrace(initialTrace);

    try {
      const response = await fetch(`${API_BASE}/api/investigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: textToScan, 
          situation: situationToScan,
          image: imageToScan,
          mime_type: mimeToScan
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
      setActiveTrace((prev) => {
        const next = [...prev];
        const activeIdx = next.findIndex(s => s.status === 'running' || s.status === 'pending');
        if (activeIdx !== -1) {
          next[activeIdx] = { step: 'Error', status: 'pending', detail: 'Server did not respond or API Key is missing.' };
        }
        return next;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!report) return;
    navigator.clipboard.writeText(report.report_draft);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleCopySummary = () => {
    if (!report) return;
    navigator.clipboard.writeText(buildShareSummary(report, reportSituation));
    setShareSuccess(true);
    setTimeout(() => setShareSuccess(false), 2000);
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

  // State machine derivation
  const appState = loading ? 'analyzing' : (report ? 'result' : 'idle');

  return (
    <div className="app-container">
      {/* HEADER SECTION (Navbar) */}
      <header>
        <div className="logo-section">
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-primary)', filter: 'drop-shadow(0 0 5px var(--accent-primary))' }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" opacity="0.2" fill="currentColor"/>
              <circle cx="12" cy="12" r="3" fill="currentColor" />
              <path d="M12 9a3 3 0 0 0-3 3" stroke="#fff" strokeWidth="1" />
            </svg>
            TrustLens
          </h1>
        </div>
        <div className="status-bar">
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
            <div className="panel" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
              <h3 className="panel-title" style={{ justifyContent: 'center', fontSize: '1.5rem', marginBottom: '2rem' }}>
                Analyze a Suspicious Message
              </h3>
            
            <div className="omnibox" style={{ position: 'relative', borderRadius: '12px', border: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.3)', overflow: 'hidden', transition: 'all 0.3s', marginBottom: '1.5rem', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)' }}>
              {imageFile ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2.5rem', gap: '1.5rem', position: 'relative' }}>
                  <img 
                    src={imageFile.startsWith('data:') ? imageFile : `data:${mimeType};base64,${imageFile}`} 
                    style={{ maxHeight: '150px', borderRadius: '0.5rem', boxShadow: 'var(--shadow-md)' }} 
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
                  <div style={{ borderTop: '1px solid var(--panel-border)', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Or upload screenshot:</span>
                    <div style={{ position: 'relative' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', pointerEvents: 'none' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.25rem', verticalAlign: 'text-bottom' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        Browse Image
                      </button>
                      <input type="file" accept="image/*" onChange={handleImageUpload} title="Upload image file" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }}/>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', padding: '0 0.5rem' }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>Select Status to Improve Accuracy</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setSituation('before_click')} 
                  style={{ flex: '1 1 120px', padding: '0.6rem', fontSize: '0.75rem', borderColor: situation === 'before_click' ? 'var(--accent-primary)' : 'var(--panel-border)', color: situation === 'before_click' ? 'var(--text-primary)' : 'var(--text-muted)', background: situation === 'before_click' ? 'rgba(0, 242, 254, 0.05)' : 'rgba(255,255,255,0.02)' }}
                >Not Clicked</button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setSituation('clicked_only')} 
                  style={{ flex: '1 1 120px', padding: '0.6rem', fontSize: '0.75rem', borderColor: situation === 'clicked_only' ? 'var(--accent-primary)' : 'var(--panel-border)', color: situation === 'clicked_only' ? 'var(--text-primary)' : 'var(--text-muted)', background: situation === 'clicked_only' ? 'rgba(0, 242, 254, 0.05)' : 'rgba(255,255,255,0.02)' }}
                >Clicked Link</button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setSituation('compromised')} 
                  style={{ flex: '1 1 120px', padding: '0.6rem', fontSize: '0.75rem', borderColor: situation === 'compromised' ? 'var(--accent-primary)' : 'var(--panel-border)', color: situation === 'compromised' ? 'var(--text-primary)' : 'var(--text-muted)', background: situation === 'compromised' ? 'rgba(0, 242, 254, 0.05)' : 'rgba(255,255,255,0.02)' }}
                >Data Shared</button>
              </div>
            </div>

            <button 
              className="btn btn-primary"
              onClick={() => handleInvestigate()}
              disabled={!inputText.trim() && !imageFile}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              Analyze Threat
            </button>

            {/* Quick Samples */}
            <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Try a sample case:</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
                <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }} onClick={() => selectSample('courier')}>DHL SMS</button>
                <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }} onClick={() => selectSample('bank')}>Bank Email</button>
                <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }} onClick={() => selectImageSample('bank')}>Bank Screen</button>
                <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }} onClick={() => selectImageSample('courier')}>Courier Screen</button>
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
          <div className="dashboard-grid animate-pulse" style={{ animation: 'none' /* Disable pulse, keep class for reference if needed */ }}>
            
            {/* Header / Verdict Panel (Full Width) */}
            <div className="panel full-width">
              <div className="verdict-header">
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>Investigation Complete</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>Confidence Index: <strong style={{ color: 'var(--text-primary)' }}>{report.confidence}%</strong></p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.35rem', fontFamily: 'var(--font-mono)' }}>
                    AI Route: <strong style={{ color: report.ai_analysis?.fallback_used ? 'var(--color-warning)' : 'var(--accent-primary)' }}>{getAiRouteLabel(report.ai_analysis)}</strong>
                  </p>
                </div>
                <div className={`verdict-badge ${report.verdict.toLowerCase()}`}>
                  {report.verdict} Threat
                </div>
              </div>
            </div>

            <div className="panel full-width">
              <h3 className="panel-title">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 16V9"/><path d="M12 16V5"/><path d="M17 16v-3"/></svg>
                Evidence Analytics
              </h3>
              <div className="metric-grid">
                {getEvidenceStats(report).map((stat) => (
                  <div key={stat.label} className="metric-item">
                    <span className="metric-label">{stat.label}</span>
                    <strong className="metric-value" style={{ color: stat.color }}>{stat.value}</strong>
                    <span className="metric-note">{stat.note}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="panel">
                <h3 className="panel-title">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  Risk Assessment
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem' }}>
                  <div className="gauge-container">
                    <svg width="160" height="160" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--panel-bg-hover)" strokeWidth="3" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={getScoreColor(report.risk_score)} strokeDasharray={`${report.risk_score}, 100`} strokeWidth="3.2" strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease-out' }} />
                    </svg>
                    <div className="gauge-val" style={{ color: getScoreColor(report.risk_score) }}>
                      {report.risk_score}<span>Score</span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '0.875rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '0.75rem', letterSpacing: '0.05em' }}>Signatures Detected</h4>
                    <div className="info-list">
                      {report.breakdown.map((item, idx) => (
                        <div key={idx} className="info-item" style={{ borderLeft: `4px solid ${getScoreColor(report.risk_score)}` }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {report.domain_reports && report.domain_reports.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.875rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '1rem', letterSpacing: '0.05em' }}>Domain Audit</h4>
                    <div className="info-list">
                      {report.domain_reports.map((dom, i) => (
                        <div key={i} className="info-item" style={{ borderLeft: `4px solid ${getScoreColor(dom.risk_score)}`, flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 500 }}>{dom.domain}</span>
                            <span style={{ fontSize: '0.875rem', color: getScoreColor(dom.risk_score), fontWeight: 700 }}>{dom.risk_score}/100</span>
                          </div>
                          {dom.indicators.map((ind, j) => (
                            <div key={j} style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem' }}>
                              <span style={{ color: 'var(--color-warning)' }}>-</span> {ind}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="panel">
                <h3 className="panel-title">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                  Sanitized Content
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Identifiable information was redacted before analysis.</p>
                <div className="redacted-view">
                  {report.redacted_text}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
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

              {report.ai_analysis && (
                <div className="panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
                    <h3 className="panel-title" style={{ marginBottom: 0 }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"/><path d="M12 18v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="m16.24 16.24 2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="m4.93 19.07 2.83-2.83"/><path d="m16.24 7.76 2.83-2.83"/><circle cx="12" cy="12" r="3"/></svg>
                      Gemma 4 Analyst
                    </h3>
                    <span className="badge" style={{ color: report.ai_analysis.fallback_used ? 'var(--color-warning)' : 'var(--accent-primary)', flexShrink: 0 }}>
                      {report.ai_analysis.fallback_used ? 'Fallback' : 'OpenRouter'}
                    </span>
                  </div>

                  <div style={{ borderLeft: `4px solid ${getPriorityColor(report.ai_analysis.recommended_priority)}`, paddingLeft: '1rem', marginBottom: '1.25rem' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: getPriorityColor(report.ai_analysis.recommended_priority), textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                      Priority: {report.ai_analysis.recommended_priority || 'review'}
                    </div>
                    <p style={{ color: 'var(--text-primary)', fontWeight: 600, lineHeight: 1.5 }}>
                      {report.ai_analysis.executive_summary}
                    </p>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.75rem', fontSize: '0.9rem' }}>
                      {report.ai_analysis.user_explanation}
                    </p>
                  </div>

                  {report.ai_analysis.evidence?.length > 0 && (
                    <div className="info-list" style={{ marginBottom: '1.25rem' }}>
                      {report.ai_analysis.evidence.slice(0, 4).map((item, idx) => (
                        <div key={idx} className="info-item" style={{ borderLeft: `4px solid ${getPriorityColor(item.severity)}`, flexDirection: 'column', gap: '0.35rem' }}>
                          <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{item.signal}</strong>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{item.why_it_matters}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {report.ai_analysis.questions?.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '1rem' }}>
                      <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Clarifying Questions</h4>
                      <div className="info-list">
                        {report.ai_analysis.questions.map((question, idx) => (
                          <div key={idx} className="info-item">
                            <span style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>{idx + 1}</span>
                            <span>{question}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {report.ai_analysis.confidence_note && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '1rem', fontFamily: 'var(--font-mono)' }}>
                      {report.ai_analysis.confidence_note}
                    </p>
                  )}
                </div>
              )}

              <div className="panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
                  <h3 className="panel-title" style={{ marginBottom: 0 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                    Report Draft
                  </h3>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" onClick={handleCopy} style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}>
                      {copySuccess ? 'Copied!' : 'Copy Report'}
                    </button>
                    <button className="btn btn-secondary" onClick={handleCopySummary} style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}>
                      {shareSuccess ? 'Copied!' : 'Copy Summary'}
                    </button>
                    <button className="btn btn-secondary" onClick={handleExportJson} style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}>
                      Export JSON
                    </button>
                  </div>
                </div>
                <div className="redacted-view" style={{ background: 'var(--bg-color)', color: 'var(--text-primary)' }}>
                  {report.report_draft}
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button className="btn btn-secondary" onClick={() => { setReport(null); setInputText(''); setImageFile(null); }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                  Analyze Another Message
                </button>
              </div>

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
                <span>OpenRouter Gemma 4</span>
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

      <footer style={{ marginTop: '4rem', padding: '2rem 1rem 3rem 1rem', borderTop: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', width: '100%' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div className="badge">
            <span className="status-dot active"></span>
            MCP Ready
          </div>
          <div className="badge" title={healthStatus.model || 'OpenRouter model'}>
            <span className={`status-dot ${healthStatus.openRouter ? 'active' : 'inactive'}`}></span>
            Gemma: {healthStatus.openRouter ? 'Live' : 'Fallback'}
          </div>
          <div className="badge">
            <span className={`status-dot ${healthStatus.keySet ? 'active' : 'inactive'}`}></span>
            Gemini OCR: {healthStatus.keySet ? 'Live' : 'Fallback'}
          </div>
          <div className="badge">
            <span className={`status-dot ${healthStatus.adk ? 'active' : 'inactive'}`}></span>
            ADK: {healthStatus.adk ? 'Active' : 'Standby'}
          </div>
        </div>
        <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>
          Built by <a href="https://pixek.xyz" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-secondary)', textDecoration: 'none', fontWeight: 700, textShadow: '0 0 10px rgba(139, 92, 246, 0.4)' }}>pixek.xyz</a>
        </div>
      </footer>
    </div>
  );
}

// Helper colors
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
  if (!ai) return 'Local TrustLens Rules';
  if (ai.fallback_used) return 'Local TrustLens Fallback';
  return `${ai.provider} / ${ai.model}`;
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

function buildShareSummary(report: InvestigationReport, situation: string) {
  const domains = report.domain_reports?.map((item) => `${item.domain} (${item.risk_score}/100)`).join(', ') || 'none';
  const actions = report.safe_steps?.slice(0, 3).map((step, idx) => `${idx + 1}. ${step}`).join('\n') || 'No actions generated.';

  return [
    `TrustLens threat summary`,
    `Verdict: ${report.verdict} (${report.risk_score}/100), confidence ${report.confidence}%`,
    `Context: ${getSituationLabel(situation)}`,
    `AI route: ${getAiRouteLabel(report.ai_analysis)}`,
    `Domains: ${domains}`,
    `Signals: ${report.breakdown.join('; ')}`,
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
