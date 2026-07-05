import React, { useState, useEffect } from 'react';

// API configuration
const API_BASE = import.meta.env.DEV ? 'http://127.0.0.1:8000' : '';

// Predefined samples matching backend CLI
const SAMPLES = {
  courier: {
    source: 'SMS',
    situation: 'before_click',
    text: 'Stimate client DHL, pachetul dvs. are o taxa vamala restanta de 14.99 RON. Va rugam sa platiti imediat pe http://dhl.customs-fee-handling.xyz/portal pentru a evita returnarea.'
  },
  bank: {
    source: 'SMS',
    situation: 'before_click',
    text: 'Banca Transilvania: Contul dumneavoastra a fost temporar restrictionat. Autentificati-va urgent pe https://bt-verificare-securizata.today/login pentru deblocare in 24 de ore.'
  },
  lottery: {
    source: 'Email',
    situation: 'before_click',
    text: 'Dear winner! Your email john.doe@gmail.com won $50,000 in Google Anniversary Promo. Write to claim@google-rewards.xyz with your phone +40722334455 and CNP 1900101998877.'
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
  report_draft: string;
  trace: TraceStep[];
  adk_framework_loaded: boolean;
  extracted_text?: string | null;
}

export default function App() {
  const [inputText, setInputText] = useState('');
  const [situation, setSituation] = useState('before_click');
  const [selectedSample, setSelectedSample] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<InvestigationReport | null>(null);
  const [activeTrace, setActiveTrace] = useState<TraceStep[]>([]);
  const [healthStatus, setHealthStatus] = useState({ adk: false, keySet: false });
  const [copySuccess, setCopySuccess] = useState(false);
  const [imageFile, setImageFile] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);

  // Load health check on mount to verify ADK setup
  useEffect(() => {
    fetch(`${API_BASE}/api/health`)
      .then((res) => res.json())
      .then((data) => {
        setHealthStatus({
          adk: data.adk_available,
          keySet: data.api_key_set
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
    setSelectedSample(key);
    setImageFile(null);
    setMimeType(null);
    setReport(null);
    setActiveTrace([]);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    setSelectedSample(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMimeType(file.type);
    setSelectedSample(null);
    setReport(null);
    setActiveTrace([]);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageFile(reader.result as string);
      setInputText(''); // Clear text when screenshot is uploaded
    };
    reader.readAsDataURL(file);
  };

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageFile(null);
    setMimeType(null);
    setInputText('');
  };

  const selectImageSample = (type: 'bank' | 'courier') => {
    const mockBase64 = type === 'bank' 
      ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=MOCK_BANK_SCREENSHOT'
      : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=MOCK_COURIER_SCREENSHOT';
      
    setImageFile(mockBase64);
    setMimeType('image/png');
    setInputText('');
    setSituation('before_click');
    setSelectedSample(`${type}_screenshot`);
    setReport(null);
    setActiveTrace([]);
  };

  const handleInvestigate = async () => {
    if (!inputText.trim() && !imageFile) return;

    setLoading(true);
    setReport(null);
    setCopySuccess(false);

    // 1. Initialize local visual trace for agent execution (prepending OCR if needed)
    const initialTrace: TraceStep[] = [];
    if (imageFile) {
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
      { step: 'Incident Report Generator', status: 'pending', detail: 'Waiting to draft incident documentation...' },
      { step: 'Safety Review Guardrail', status: 'pending', detail: 'Waiting for guardrail validation...' }
    );
    setActiveTrace(initialTrace);

    try {
      const response = await fetch(`${API_BASE}/api/investigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: inputText, 
          situation,
          image: imageFile,
          mime_type: mimeType
        })
      });

      if (!response.ok) {
        throw new Error('API Request failed.');
      }

      const data: InvestigationReport = await response.json();
      if (data.extracted_text) {
        setInputText(data.extracted_text);
      }

      // 2. Play out the trace steps sequentially to show agent workflow in the UI
      for (let i = 0; i < data.trace.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 350));
        setActiveTrace((prev) => {
          const next = [...prev];
          if (next[i]) {
            next[i] = {
              ...data.trace[i],
              status: 'completed'
            };
          }
          // Set next one as active if exists
          if (next[i + 1]) {
            next[i + 1].status = 'running';
          }
          return next;
        });
      }

      // Display the final output
      await new Promise((resolve) => setTimeout(resolve, 200));
      setReport(data);
    } catch (err) {
      console.error(err);
      setActiveTrace((prev) => {
        const next = [...prev];
        const activeIdx = next.findIndex(s => s.status === 'running' || s.status === 'pending');
        if (activeIdx !== -1) {
          next[activeIdx] = {
            step: 'Error',
            status: 'pending',
            detail: 'Server did not respond or API Key is missing.'
          };
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

  return (
    <div className="app-container">
      {/* HEADER SECTION */}
      <header>
        <div className="logo-section">
          <h1>🛡️ TrustLens Agent</h1>
          <p>AI Security Concierge for Investigating Suspicious Messages</p>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
          <div className="badge-mcp">
            <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#a855f7', borderRadius: '50%' }}></span>
            MCP Exporter Enabled
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', color: varColor(healthStatus.adk) }}>
            <span>ADK: {healthStatus.adk ? '● Active' : '○ Standby'}</span>
          </div>
        </div>
      </header>

      {/* DASHBOARD GRID */}
      <div className="dashboard-grid">
        
        {/* LEFT COLUMN: INPUT & TERMINAL TRACE */}
        <div className="flex-column">
          <div className="glass-panel">
            <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📥 Case Intake
            </h3>
            
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem', marginBottom: '0.75rem' }}>
                <div>
                  <label>Suspicious Message Content</label>
                  <textarea 
                    value={inputText}
                    onChange={handleTextChange}
                    placeholder="Paste the suspicious SMS, email body, chat alert here..."
                    disabled={loading || !!imageFile}
                    style={{ minHeight: '120px' }}
                  />
                </div>
                <div>
                  <label>Or Upload Screenshot</label>
                  <div style={{
                    border: '2px dashed var(--panel-border)',
                    borderRadius: '10px',
                    height: '120px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(10, 8, 28, 0.4)',
                    cursor: 'pointer',
                    position: 'relative',
                    padding: '0.5rem',
                    textAlign: 'center',
                    transition: 'all 0.3s'
                  }}>
                    {imageFile ? (
                      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                        <img 
                          src={imageFile.startsWith('data:') ? imageFile : `data:${mimeType};base64,${imageFile}`} 
                          style={{ maxHeight: '60px', borderRadius: '4px', maxWidth: '100%' }} 
                        />
                        <button 
                          onClick={clearImage}
                          style={{ background: 'var(--color-danger)', border: 'none', borderRadius: '4px', color: 'white', padding: '0.1rem 0.5rem', fontSize: '0.7rem', cursor: 'pointer' }}
                          disabled={loading}
                        >
                          Clear Image
                        </button>
                      </div>
                    ) : (
                      <>
                        <span style={{ fontSize: '1.25rem', marginBottom: '0.2rem' }}>📸</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Drag & drop image here or click</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleImageUpload} 
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                          disabled={loading}
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="samples-row">
                <span style={{ fontSize: '0.75rem', alignSelf: 'center', color: 'var(--text-secondary)', marginRight: '0.25rem' }}>Text Cases:</span>
                {(Object.keys(SAMPLES) as Array<keyof typeof SAMPLES>).map((key) => (
                  <button 
                    key={key}
                    className={`btn-sample ${selectedSample === key ? 'active' : ''}`}
                    onClick={() => selectSample(key)}
                    disabled={loading}
                  >
                    {key}
                  </button>
                ))}
              </div>
              <div className="samples-row" style={{ marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', alignSelf: 'center', color: 'var(--text-secondary)', marginRight: '0.25rem' }}>Screenshots:</span>
                <button 
                  className={`btn-sample ${selectedSample === 'bank_screenshot' ? 'active' : ''}`}
                  onClick={() => selectImageSample('bank')}
                  disabled={loading}
                >
                  📷 Bank Scam Screen
                </button>
                <button 
                  className={`btn-sample ${selectedSample === 'courier_screenshot' ? 'active' : ''}`}
                  onClick={() => selectImageSample('courier')}
                  disabled={loading}
                >
                  📷 Courier Scam Screen
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label>Your Situation Context</label>
              <select 
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
                disabled={loading}
              >
                <option value="before_click">I haven't clicked the link / replied yet (Prevention mode)</option>
                <option value="clicked_only">I clicked the link, but didn't share data (Inspection mode)</option>
                <option value="compromised">I shared my password, bank details, or code (Recovery mode)</option>
              </select>
            </div>

            <button 
              className="btn-primary"
              onClick={handleInvestigate}
              disabled={loading || (!inputText.trim() && !imageFile)}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Agent Running Heuristics...
                </>
              ) : (
                '🔍 Trigger Agent Investigation'
              )}
            </button>
          </div>

          {/* AGENT TERMINAL TIMELINE */}
          {activeTrace.length > 0 && (
            <div className="glass-panel">
              <h3 style={{ fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                💻 Agent Investigation Timeline
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem', marginBottom: '0.5rem' }}>
                Live audit trace of tools invoked by the ADK Coordinator
              </p>
              
              <div className="console-timeline">
                {activeTrace.map((step, idx) => (
                  <div key={idx} className="timeline-step">
                    <span className={`step-status ${step.status}`}>
                      {step.status === 'completed' ? '✓' : step.status === 'running' ? '●' : '○'}
                    </span>
                    <span className="step-name">[{step.step}]</span>
                    <span className="step-detail">{step.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: OUTCOME / REPORT */}
        <div>
          {!report && (
            <div className="glass-panel" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                <h4 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Awaiting Threat Data</h4>
                <p style={{ maxWidth: '300px', fontSize: '0.85rem' }}>
                  Paste a suspicious text message and click "Trigger Agent Investigation" to see security assessment results.
                </p>
              </div>
            </div>
          )}

          {report && (
            <div className="flex-column">
              {/* VERDICT SUMMARY */}
              <div className="glass-panel">
                <div className="verdict-header">
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)' }}>Threat Verdict</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      Confidence Index: {report.confidence}%
                    </p>
                  </div>
                  <div className={`verdict-badge ${report.verdict.toLowerCase()}`}>
                    {report.verdict} Risk
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div className="meter-circle">
                    <div className="score-val" style={{ color: getScoreColor(report.risk_score) }}>
                      {report.risk_score}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                      Threat Signatures Found:
                    </h4>
                    <div className="indicators-list">
                      {report.breakdown.map((item, idx) => (
                        <div key={idx} className="indicator-item" style={{ borderLeftColor: getScoreColor(report.risk_score) }}>
                          <span className="indicator-desc">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {report.domain_reports && report.domain_reports.length > 0 && (
                  <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--panel-border)', paddingTop: '1rem' }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                      Domain Inspection Audit
                    </h4>
                    {report.domain_reports.map((dom, i) => (
                      <div key={i} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600 }}>
                          <span className="text-cyan">{dom.domain}</span>
                          <span style={{ color: getScoreColor(dom.risk_score) }}>Score: {dom.risk_score}/100</span>
                        </div>
                        {dom.indicators.map((ind, j) => (
                          <div key={j} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', paddingLeft: '0.5rem' }}>
                            ⚠ {ind}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PRIVACY SANITIZATION PANEL */}
              <div className="glass-panel">
                <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
                  🔒 Privacy Guardrail (Sanitized Text)
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Message body forwarded to models after redact_pii anonymization
                </p>
                <div className="redacted-view">
                  {report.redacted_text}
                </div>
              </div>

              {/* ACTION PLAN */}
              <div className="glass-panel">
                <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
                  🛡️ Safe Action Plan
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Action steps customized for: <strong>{getSituationLabel(situation)}</strong>
                </p>
                
                <div className="safe-steps-container">
                  {report.safe_steps.map((step, idx) => {
                    const cleanStep = step.replace(/^\u26a0\ufe0f\s*|\u274c\s*|\u2611\ufe0f\s*|\u26a1\ufe0f\s*/, '').replace(/\*\*/g, '');
                    const prefix = step.match(/^\u26a0\ufe0f|\u274c|\u2611\ufe0f|\u26a1\ufe0f|🚨/)?.[0] || '●';
                    
                    return (
                      <div key={idx} className="step-card">
                        <div className="step-number" style={{ background: getScoreColor(report.risk_score) }}>
                          {idx + 1}
                        </div>
                        <div className="step-text">
                          <span style={{ marginRight: '0.5rem' }}>{prefix}</span>
                          {cleanStep}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* REPORT DRAFT */}
              <div className="glass-panel report-panel">
                <div className="flex-row-spaced">
                  <h3 style={{ fontFamily: 'var(--font-display)' }}>📋 Authority Report Draft</h3>
                  <button className="btn-copy" onClick={handleCopy}>
                    {copySuccess ? '✓ Copied!' : 'Copy Report'}
                  </button>
                </div>
                <div className="report-text">
                  {report.report_draft}
                </div>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// Helper colors
function getScoreColor(score: number) {
  if (score >= 70) return '#ef4444'; // Red
  if (score >= 35) return '#f59e0b'; // Yellow
  return '#10b981'; // Green
}

function varColor(active: boolean) {
  return active ? '#10b981' : '#6b7280';
}

function getSituationLabel(sit: string) {
  switch (sit) {
    case 'before_click': return 'Prevention Mode (Before Clicking)';
    case 'clicked_only': return 'Inspection Mode (Clicked, No Data Entered)';
    case 'compromised': return 'Recovery Mode (Data Compromised)';
    default: return 'Standard Mode';
  }
}
