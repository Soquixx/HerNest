import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowLeft, ArrowRight, BadgeCheck, BookOpen, Check, CheckCircle2, ChevronDown,
  ChevronRight, CircleAlert, ClipboardCheck, Clock3, Download, FileCheck2, FileImage,
  FileText, Fingerprint, Globe2, HeartHandshake, LockKeyhole, Menu, MessageSquareText,
  Plus, ScanText, Shield, ShieldAlert, ShieldCheck, Sparkles, Trash2, UploadCloud,
  X, Eye, ExternalLink, Link2, Quote, RotateCcw, Home, ArrowUpRight, Flag
} from 'lucide-react';
import './styles.css';
import HomePage from './components/HomePage.jsx';
import ThemeButton from './components/ThemeButton.jsx';
import CropOcrTool from './components/CropOcrTool.jsx';
import GuidedQuestionnaire from './components/GuidedQuestionnaire.jsx';
import EvidenceTimeline from './components/EvidenceTimeline.jsx';
import ProtectNow from './components/ProtectNow.jsx';
import { uid, parseChat } from './lib/chatParser.js';
import { sha256 } from './lib/fileIntegrity.js';
import { makeRedacted } from './lib/redaction.js';
import { PLATFORMS, ROUTE_RULES, getRelevantRoutes } from './lib/routing.js';
import { buildQuestionnaireFacts } from './lib/questionnaire.js';
import { appendOcrMessage, appendOcrSegment } from './lib/evidenceState.js';
import { assignExhibitNumber, buildExhibitIndex, evidenceStrengthForMessage, STRENGTH_LABELS } from './lib/exhibits.js';
import { summarizeAfterRefusal, refusalTimelineFact } from './lib/timeline.js';
import { LANGUAGES, t } from './lib/i18n.js';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const STEPS = [
  { id: 0, label: 'Evidence', subtitle: 'Import your material', icon: UploadCloud },
  { id: 1, label: 'Review', subtitle: 'Verify and protect', icon: ClipboardCheck },
  { id: 2, label: 'Action plan', subtitle: 'Choose next steps', icon: HeartHandshake },
  { id: 3, label: 'Export', subtitle: 'Prepare your report', icon: FileCheck2 },
];
const TAGS = [
  { id: 'sextortion', label: 'Coercion involving private images' },
  { id: 'stalking', label: 'Repeated unwanted contact' },
  { id: 'impersonation', label: 'Impersonation or fake account' },
  { id: 'image_misuse', label: 'Image shared without consent' },
  { id: 'threat', label: 'Threat or intimidation' },
  { id: 'financial_fraud', label: 'Possible financial fraud' },
  { id: 'other', label: 'Other concern' },
];
const ROUTE_ICONS = { globe: Globe2, message: MessageSquareText, shield: ShieldCheck, alert: CircleAlert, heart: HeartHandshake, emergency: ShieldAlert };
const ROUTES = ROUTE_RULES.map((route) => ({ ...route, icon: ROUTE_ICONS[route.iconKey] }));


function App() {
  const [view, setView] = useState('home');
  const [language, setLanguage] = useState('en');
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('hernest-theme') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; } });
  const [step, setStep] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [caseTitle, setCaseTitle] = useState('Untitled case');
  const [platform, setPlatform] = useState('');
  const [rawText, setRawText] = useState('');
  const [messages, setMessages] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [hashStatus, setHashStatus] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [confirmedFacts, setConfirmedFacts] = useState([]);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [redactionOpen, setRedactionOpen] = useState(true);
  const [useRedaction, setUseRedaction] = useState(true);
  const [syntheticConsent, setSyntheticConsent] = useState(false);
  const [isSynthetic, setIsSynthetic] = useState(false);
  const [reportType, setReportType] = useState('complaint');
  const [isQuickExit, setIsQuickExit] = useState(false);
  const [ocrStatus, setOcrStatus] = useState('');
  const [cropTarget, setCropTarget] = useState(null);
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState({});
  const escapeArmedAt = useRef(0);
  const [immediateDanger, setImmediateDanger] = useState(false);
  const [includeTranscriptPdf, setIncludeTranscriptPdf] = useState(false);
  const [includeScreenshotsPdf, setIncludeScreenshotsPdf] = useState(false);
  const [includeExhibitsPdf, setIncludeExhibitsPdf] = useState(true);
  const exhibitSequence = useRef(0);
  const fileInput = useRef(null);
  const imageInput = useRef(null);

  const selectedMessage = messages.find((m) => m.id === selectedId) || messages[0] || null;
  const timelineSummary = useMemo(() => summarizeAfterRefusal(messages), [messages]);
  const timelineFact = useMemo(() => refusalTimelineFact(timelineSummary), [timelineSummary]);
  const exhibitIndex = useMemo(() => buildExhibitIndex(messages, evidence), [messages, evidence]);
  const redactedText = useMemo(() => useRedaction ? makeRedacted(messages.map((m) => `${m.time ? `[${m.time}] ` : ''}${m.sender}: ${m.text}`).join('\n')) : messages.map((m) => `${m.time ? `[${m.time}] ` : ''}${m.sender}: ${m.text}`).join('\n'), [messages, useRedaction]);
  const completed = [messages.length > 0, messages.length > 0 && messages.every((m) => m.verified), confirmedFacts.some((f) => f.confirmed), messages.length > 0];

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('hernest-theme', theme); } catch { /* Theme preference is optional. */ }
  }, [theme]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Escape' || view !== 'workspace' || cropTarget) return;
      const now = Date.now();
      if (now - escapeArmedAt.current <= 3000 && escapeArmedAt.current > 0) {
        escapeArmedAt.current = 0;
        quickExit();
      } else {
        escapeArmedAt.current = now;
        setNotice('Quick exit armed. Press Esc once more within 3 seconds to clear this case.');
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [messages, evidence, rawText, view, cropTarget]);

  async function importText(text, file = null) {
    setError(''); setNotice(''); setAnalysisResult(null); setConfirmedFacts([]); setSyntheticConsent(false); setIsSynthetic(false);
    setRawText(text);
    exhibitSequence.current = 0;
    const transcriptEvidenceId = uid('ev');
    const parsed = parseChat(text).map((message) => ({ ...message, evidenceId: transcriptEvidenceId, sourceType: 'text', evidenceStrength: file ? 'chat_export' : 'typed' }));
    setQuestionnaireAnswers({});
    setMessages(parsed); setSelectedId(parsed[0]?.id || '');
    setCaseTitle(file?.name?.replace(/\.[^.]+$/, '') || 'Online abuse evidence');
    try {
      const hash = await sha256(file || new Blob([text], { type: 'text/plain' }));
      setEvidence((prev) => [{ id: transcriptEvidenceId, name: file?.name || 'extracted-transcript.txt', type: 'text/plain', size: file?.size ?? new Blob([text]).size, hash, addedAt: new Date().toISOString(), kind: 'transcript' }, ...prev.filter((x) => x.kind !== 'transcript')]);
      setHashStatus('SHA-256 calculated locally');
    } catch (e) { setHashStatus(e.message); }
    setStep(1);
  }
  async function handleTextFile(event) {
    const file = event.target.files?.[0]; if (!file) return;
    try { await importText(await file.text(), file); } catch { setError('Could not read this text file. Try a UTF-8 .txt export.'); }
    event.target.value = '';
  }
  function updateMessage(id, patch) {
    setIsSynthetic(false);
    setSyntheticConsent(false);
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, ...patch, verified: false } : m));
    setConfirmedFacts((prev) => prev.map((f) => f.sourceIds.includes(id) ? { ...f, confirmed: false } : f));
  }
  function loadSample() {
    const sample = `[24/10/2026, 6:10 pm] - Unknown: I will share your private photo unless you pay me.\n[24/10/2026, 6:12 pm] - Me: Stop contacting me.\n[24/10/2026, 6:15 pm] - Unknown: You have one hour. Send the money or I will post it.\n[24/10/2026, 6:20 pm] - Me: I do not consent to you sharing any photos.`;
    setCaseTitle('Synthetic sextortion scenario'); setIsSynthetic(true); setSyntheticConsent(false);
    importText(sample).then(() => { setCaseTitle('Synthetic sextortion scenario'); setIsSynthetic(true); setSyntheticConsent(false); setNotice('Synthetic example loaded. Demo AI is only for fictional content.'); });
  }
  async function handleImageFiles(event) {
    const files = Array.from(event.target.files || []); event.target.value = '';
    if (files.length) { setIsSynthetic(false); setSyntheticConsent(false); }
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const hash = await sha256(file);
        let imageWidth = null; let imageHeight = null;
        try { const bitmap = await createImageBitmap(file); imageWidth = bitmap.width; imageHeight = bitmap.height; bitmap.close(); } catch { /* OCR can still run without dimensions. */ }
        const item = { id: uid('ev'), name: file.name, type: file.type, size: file.size, hash, addedAt: new Date().toISOString(), kind: 'image', file, url: URL.createObjectURL(file), imageWidth, imageHeight };
        setEvidence((prev) => [...prev, item]);
        setNotice(`Added ${file.name}; its hash was calculated locally. OCR runs only when you request it.`);
      } catch (e) { setError(e.message); }
    }
  }
  function markAllReviewed() {
    setMessages((prev) => prev.map((m) => ({ ...m, verified: true })));
    setNotice('Transcript marked as reviewed. Please check every message before confirming facts.');
  }
  function markRefusal(messageId) {
    const index = messages.findIndex((message) => message.id === messageId);
    const refusal = messages[index];
    if (!refusal) return;
    const ownSender = String(refusal.sender || '').trim().toLowerCase();
    const nextOther = messages.slice(index + 1).find((message) => message.side === 'them' || (!message.side && String(message.sender || '').trim().toLowerCase() !== ownSender));
    setMessages((previous) => previous.map((message) => ({ ...message, role: message.id === messageId ? 'refusal' : (message.role === 'refusal' ? undefined : message.role), side: message.id === messageId ? 'me' : (message.side || (String(message.sender || '').trim().toLowerCase() === ownSender ? 'me' : 'them')) })));
    if (nextOther) {
      setQuestionnaireAnswers((previous) => ({ ...previous, continued_contact: { ...(previous.continued_contact || {}), answer: 'yes', sourceId: nextOther.id } }));
      setNotice('Refusal marked. A later message is preselected for the continued-contact question; review and confirm it yourself.');
    } else setNotice('Refusal marked. The timeline counts only later messages you have reviewed.');
  }
  function setQuestionAnswer(questionId, answer) {
    setQuestionnaireAnswers((previous) => ({ ...previous, [questionId]: { ...(previous[questionId] || {}), ...answer } }));
  }
  function generateQuestionnaireFacts() {
    const drafts = buildQuestionnaireFacts(questionnaireAnswers, messages, () => uid('fact'));
    if (!drafts.length) {
      setNotice('Answer “Yes” and select the supporting source message for at least one question. Nothing is added without a source.');
      return;
    }
    setConfirmedFacts((previous) => {
      const known = new Set(previous.map((fact) => `${fact.tag}:${fact.sourceIds[0] || ''}`));
      return [...previous, ...drafts.filter((fact) => !known.has(`${fact.tag}:${fact.sourceIds[0] || ''}`))];
    });
    setAnalysisResult(null);
    setNotice(`${drafts.length} user-reported fact draft(s) added. Review each source and confirm manually.`);
  }
  function handleCroppedMessage(message) {
    exhibitSequence.current += 1;
    const exhibitNumber = assignExhibitNumber(exhibitSequence.current);
    const exhibitMessage = { ...message, exhibitNumber, evidenceStrength: 'screenshot_crop' };
    setMessages((previous) => appendOcrMessage(previous, exhibitMessage));
    setSelectedId(message.id);
    setEvidence((previous) => appendOcrSegment(previous, exhibitMessage));
    setStep(1);
    setNotice(`Added one ${message.side === 'me' ? 'your message' : 'other-person message'} from ${message.sourceImageName}. It was appended; existing transcript messages were not replaced.`);
  }
  async function runDemoAI() {
    if (!isSynthetic || !syntheticConsent) { setError('AI demo mode is only for synthetic fictional conversations. Load the synthetic example and confirm the notice first.'); return; }
    if (!messages.length) { setError('Import a synthetic conversation first.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(`${API_BASE}/api/demo/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'synthetic_demo', transcript: redactedText.slice(0, 12000), language: 'English' }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || 'AI demo request failed. Use local suggestions instead.');
      setAnalysisResult(payload);
      const aiFacts = (payload.facts || []).map((fact) => {
        const match = messages.find((m) => m.text.includes(fact.evidence_quote) || fact.evidence_quote.includes(m.text)) || messages.find((m) => fact.evidence_quote && m.text.toLowerCase().includes(fact.evidence_quote.toLowerCase().slice(0, 35)));
        return { id: uid('fact'), tag: fact.category, label: TAGS.find((t) => t.id === fact.category)?.label || fact.category, summary: fact.summary, quote: fact.evidence_quote, sourceIds: match ? [match.id] : [], confirmed: false, source: payload.engine === 'gemini' ? 'Synthetic demo AI' : 'Rule fallback (synthetic demo)', severity: fact.suggested_severity, confidence: fact.confidence };
      });
      setConfirmedFacts((previous) => {
        const known = new Set(previous.map((fact) => `${fact.tag}:${fact.sourceIds?.[0] || ''}:${fact.summary}`));
        return [...previous, ...aiFacts.filter((fact) => !known.has(`${fact.tag}:${fact.sourceIds?.[0] || ''}:${fact.summary}`))];
      });
      setNotice('Demo analysis returned. Each suggestion needs manual confirmation; check every quote against the transcript. Existing questionnaire drafts were kept.');
    } catch (e) { setError(`${e.message} Local review remains available.`); }
    finally { setBusy(false); }
  }
  function toggleFact(id, checked) {
    const fact = confirmedFacts.find((item) => item.id === id);
    const hasValidSource = fact?.sourceIds?.some((sourceId) => messages.some((message) => message.id === sourceId));
    if (checked && !hasValidSource) {
      setError('Link this fact to a real source message before confirming it.');
      return;
    }
    setConfirmedFacts((prev) => prev.map((f) => f.id === id ? { ...f, confirmed: checked } : f));
  }
  function linkFactSource(factId, messageId) {
    const source = messages.find((message) => message.id === messageId);
    if (!source) return;
    setConfirmedFacts((prev) => prev.map((fact) => fact.id === factId
      ? { ...fact, sourceIds: [source.id], quote: source.text, confirmed: false }
      : fact));
  }
  function addManualFact() {
    const source = selectedMessage;
    const item = { id: uid('fact'), tag: 'other', label: 'Other concern', summary: 'User-confirmed observation (edit this text before export).', quote: source?.text || '', sourceIds: source ? [source.id] : [], confirmed: false, source: 'manual' };
    setConfirmedFacts((prev) => [...prev, item]);
  }
  function updateFact(id, patch) { setConfirmedFacts((prev) => prev.map((f) => f.id === id ? { ...f, ...patch, confirmed: false } : f)); }
  const confirmed = confirmedFacts.filter((f) => f.confirmed);
  const confirmedTags = new Set(confirmed.map((fact) => fact.tag));
  const relevantRoutes = getRelevantRoutes(ROUTES, confirmedTags, immediateDanger);
  const preferredOcrLanguage = language === 'hi' ? 'hin' : language === 'te' ? 'tel' : 'eng';
  const platformHelp = PLATFORMS.find((item) => item.id === platform) || null;
  const quoteForOutput = (text) => useRedaction ? makeRedacted(text || '') : (text || '');
  const sourceForFact = (fact) => messages.find((m) => fact.sourceIds.includes(m.id)) || null;
  const reportBody = confirmed.length ? confirmed.map((fact, i) => `${i + 1}. ${fact.summary}${fact.quote ? ` Source message: “${fact.quote}”` : ''}`).join('\n\n') : 'No facts have been confirmed yet. Return to Review and confirm only facts supported by the original evidence.';
  function goStep(next) {
    setError(''); setNotice('');
    if (next > 0 && !messages.length) { setError('Import a chat export or paste a conversation first.'); setStep(0); return; }
    if (next >= 2 && !messages.every((m) => m.verified)) { setError('Review the transcript and mark every message as reviewed before continuing.'); setStep(1); return; }
    setStep(Math.max(0, Math.min(3, next)));
  }
  function exportPdf() { window.print(); }
  function quickExit() { evidence.forEach((e) => { if (e.url) URL.revokeObjectURL(e.url); }); setIsQuickExit(true); setCropTarget(null); setRawText(''); setMessages([]); setQuestionnaireAnswers({}); setConfirmedFacts([]); setAnalysisResult(null); setSyntheticConsent(false); setIsSynthetic(false); setSelectedId(''); setEvidence([]); setImmediateDanger(false); setIncludeTranscriptPdf(false); setIncludeScreenshotsPdf(false); setIncludeExhibitsPdf(false); setCaseTitle('Notes'); }
  function restartCase() { evidence.forEach((e) => { if (e.url) URL.revokeObjectURL(e.url); }); setIsQuickExit(false); setStep(0); setCaseTitle('Untitled case'); setPlatform(''); setRawText(''); setMessages([]); setEvidence([]); setQuestionnaireAnswers({}); setConfirmedFacts([]); setAnalysisResult(null); setNotice(''); setError(''); setIsSynthetic(false); setSyntheticConsent(false); setHashStatus(''); setCropTarget(null); setImmediateDanger(false); setIncludeTranscriptPdf(false); setIncludeScreenshotsPdf(false); setIncludeExhibitsPdf(true); setReportType('complaint'); exhibitSequence.current = 0; escapeArmedAt.current = 0; }

  if (isQuickExit) return <main className="neutral-exit" data-theme={theme}><div className="exit-mark">HN</div><p className="eyebrow">NOTES</p><h1>A quiet place to collect your thoughts.</h1><p>This neutral screen does not erase browser history, screenshots, downloads, or data already shared externally.</p><button className="button button-outline" onClick={restartCase}>Return to start</button></main>;

  if (view === 'home') return <HomePage theme={theme} onToggleTheme={() => setTheme((t) => t === 'dark' ? 'light' : 'dark')} onStart={() => { setView('workspace'); setStep(0); window.scrollTo({ top: 0, behavior: 'smooth' }); }}/>;

  return <div className="app-shell" data-theme={theme}>
    <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
      <div className="brand-row"><img src={theme === 'dark' ? '/assets/hernest-mark-dark.png' : '/assets/hernest-mark-transparent.png'} alt="HerNest logo" className="brand-mark"/><div className="brand-text"><strong>HerNest</strong><span>Your voice, supported.</span></div><button className="icon-button mobile-menu-close" aria-label="Close menu" onClick={() => setMenuOpen(false)}><X size={16}/></button></div>
      <div className="workspace-label">YOUR WORKSPACE</div>
      <button className="new-case" onClick={restartCase}><Plus size={14}/> New case</button>
      <nav className="step-nav" aria-label="Case steps">
        {STEPS.map((s) => { const Icon = s.icon; const active = step === s.id; const done = completed[s.id] && step > s.id; const stepLabel = t(['evidence','review','actionPlan','export'][s.id], language); return <button key={s.id} className={`step-link ${active ? 'active' : ''} ${done ? 'done' : ''}`} onClick={() => goStep(s.id)}><span className="step-icon">{done ? <Check size={15}/> : <Icon size={15}/>}</span><span className="step-text"><strong>{stepLabel}</strong><small>{s.subtitle}</small></span>{active && <ChevronRight className="step-chevron" size={14}/>}</button>; })}
      </nav>
      <div className="sidebar-bottom"><div className="privacy-card"><ShieldCheck size={16}/><div><strong>Private by design</strong><p>Original files stay in this browser during local processing.</p></div></div><button className="quick-exit" onClick={() => { if (window.confirm('Clear this case from the current page? This cannot undo exported or externally shared copies.')) quickExit(); }}><X size={14}/> Quick exit <span>Esc × 2</span></button><small className="quick-exit-hint">Press Esc twice within 3 seconds to clear this case.</small><div className="sidebar-foot">HerNest · Prototype v0.1</div></div>
    </aside>
    {menuOpen && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)}/>}
    <main className="main-area">
      <header className="topbar"><button className="icon-button mobile-menu-open" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Menu size={18}/></button><button className="top-home" onClick={() => setView('home')} aria-label="Go to home"><Home size={14}/><span>Home</span></button><div className="breadcrumbs"><ChevronRight size={13}/><strong>{t(['evidence','review','actionPlan','export'][step], language)}</strong></div><div className="topbar-right"><span className="local-pill"><span/> Local workspace</span><label className="language-switcher" aria-label="Interface language"><Globe2 size={13}/><select value={language} onChange={(e) => setLanguage(e.target.value)}>{LANGUAGES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><ThemeButton theme={theme} onToggle={() => setTheme((t) => t === 'dark' ? 'light' : 'dark')}/><button className="avatar" aria-label="Anonymous case">H</button></div></header>
      <div className="content-wrap">
        <div className="page-heading"><div><p className="eyebrow">DIGITAL SAFETY COMPANION</p><h1>{t(['startTitle','reviewTitle','planTitle','exportTitle'][step], language)}</h1><p className="page-subtitle">{t(['startSubtitle','reviewSubtitle','planSubtitle','exportSubtitle'][step], language)}</p></div><div className="case-chip"><Shield size={14}/><span>No account needed</span></div></div>
        <div className="progress-row"><div className="progress-track">{STEPS.map((s) => <span key={s.id} className={s.id <= step ? 'filled' : ''}/>)}</div><span>STEP {step + 1} OF 4</span></div>
        {(error || notice) && <div className={`notice ${error ? 'notice-error' : 'notice-ok'}`} role="status">{error ? <CircleAlert size={15}/> : <CheckCircle2 size={15}/>}<span>{error || notice}</span><button onClick={() => { setError(''); setNotice(''); }} aria-label="Dismiss"><X size={14}/></button></div>}

        {step === 0 && <section className="step-content">
          <div className="welcome-banner"><div className="welcome-copy"><div className="banner-kicker"><Sparkles size={13}/> A calmer way forward</div><h2>Your evidence. Your voice. Your next step.</h2><p>Bring messages and screenshots together. Review the facts. Choose what happens next.</p><div className="banner-points"><span><CheckCircle2 size={14}/> Local file fingerprint</span><span><CheckCircle2 size={14}/> You review every fact</span><span><CheckCircle2 size={14}/> Export when ready</span></div></div><div className="banner-art"><div className="banner-brand-lockup"><img src={theme === 'dark' ? '/assets/hernest-mark-dark.png' : '/assets/hernest-mark-transparent.png'} alt="HerNest profile mark"/><span>Her<em>Nest</em></span></div><div className="art-note"><ShieldCheck size={15}/><span>Your case stays yours.</span></div></div></div>
          <ProtectNow language={language}/>
          <div className="section-title"><div><h2>Bring your evidence</h2><p>Start with a chat export or paste the relevant messages.</p></div><span className="section-step">01 / INTAKE</span></div>
          <div className="intake-grid">
            <button className="upload-card" onClick={() => fileInput.current?.click()}><span className="upload-icon"><UploadCloud size={20}/></span><strong>Upload chat export</strong><span>Choose a .txt file from WhatsApp or another chat app.</span><span className="card-cta">Choose file <ArrowRight size={14}/></span></button>
            <button className="upload-card" onClick={() => imageInput.current?.click()}><span className="upload-icon"><FileImage size={20}/></span><strong>Add screenshot evidence</strong><span>Image files are hashed locally. OCR is an optional next step.</span><span className="card-cta">Choose images <ArrowRight size={14}/></span></button>
            <input ref={fileInput} className="hidden-input" type="file" accept=".txt,text/plain" onChange={handleTextFile}/>
            <input ref={imageInput} className="hidden-input" type="file" accept="image/*" multiple onChange={handleImageFiles}/>
          </div>
          <div className="platform-select card"><label htmlFor="platform-select">Where did it happen? <span>Optional</span><select id="platform-select" value={platform} onChange={(e) => setPlatform(e.target.value)}><option value="">Choose a platform (optional)</option>{PLATFORMS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><small>This only tailors the reporting link. It is not sent with evidence.</small></div>
          {evidence.some((e) => e.kind === 'image') && <div className="card image-evidence-card"><div className="section-title tight"><div><h3>Screenshot evidence</h3><p>Draw a box around each message. Only the selected crop is sent to the local OCR engine; each result is appended to the transcript.</p></div></div>{evidence.filter((e) => e.kind === 'image').map((item) => <div className="evidence-file" key={item.id}><img src={item.url} alt="Uploaded evidence thumbnail"/><div className="evidence-file-name"><strong>{item.name}</strong><span>{Math.round(item.size / 1024)} KB · SHA-256 stored locally · {(item.ocrSegments || []).length} crop(s) extracted</span></div><button className="button button-small button-outline" disabled={busy} onClick={() => setCropTarget(item)}><ScanText size={13}/>Select message crops</button></div>)}</div>}
          <div className="paste-card card"><div className="paste-header"><div><h3>Or paste a conversation</h3><p>Use only the parts needed to document the incident.</p></div><button className="text-button" onClick={loadSample}><Sparkles size={14}/> Load synthetic example</button></div><textarea value={rawText} onChange={(e) => { setRawText(e.target.value); setIsSynthetic(false); setSyntheticConsent(false); }} placeholder={'Paste a chat export here…\nExample: [24/10/2026, 6:10 pm] Person: Message text'} rows={6}/><div className="paste-footer"><span><LockKeyhole size={13}/> Text is processed in this browser until you explicitly choose demo analysis.</span><button className="button button-primary" disabled={!rawText.trim()} onClick={() => importText(rawText)}>Parse conversation <ArrowRight size={14}/></button></div></div>
          <div className="how-strip"><div><span className="how-icon"><Fingerprint size={16}/></span><div><strong>Fingerprint</strong><p>SHA-256 hash of the imported file or pasted text.</p></div></div><div><span className="how-icon"><Eye size={16}/></span><div><strong>Review first</strong><p>No suggestion is marked confirmed automatically.</p></div></div><div><span className="how-icon"><FileText size={16}/></span><div><strong>Export a draft</strong><p>Review any generated report before sharing it.</p></div></div></div>
        </section>}

        {step === 1 && <section className="step-content">
          <div className="review-summary"><div className="summary-leading"><span className="summary-icon"><MessageSquareText size={18}/></span><div><strong>{caseTitle || 'Case transcript'}</strong><p>{messages.length} messages · {evidence.length} evidence item(s)</p></div></div><div className="hash-mini"><Fingerprint size={14}/><span>{hashStatus || 'Hash pending'}</span></div></div>
          {evidence.length > 0 && <div className="evidence-list card">{evidence.map((item) => <div className="evidence-file" key={item.id}>{item.kind === 'image' && item.url ? <img src={item.url} alt="Evidence thumbnail"/> : <span className="file-symbol"><FileText size={17}/></span>}<div className="evidence-file-name"><strong>{item.name}</strong><span>{item.size} bytes · SHA-256: {item.hash.slice(0, 14)}…</span></div><button className="icon-button" aria-label={`Remove ${item.name}`} onClick={() => setEvidence((prev) => prev.filter((e) => e.id !== item.id))}><Trash2 size={14}/></button></div>)}</div>}
          <div className="section-title"><div><h2>Transcript verification</h2><p>Correct names, wording, and sequence. Editing a message resets its reviewed state.</p></div><button className="button button-outline button-small" onClick={markAllReviewed}><Check size={14}/> Mark all reviewed</button></div>
          {messages.length === 0 ? <div className="empty-state card"><FileText size={23}/><h3>No transcript yet</h3><p>Go back to Evidence and import a text export or paste a conversation.</p><button className="button button-primary" onClick={() => setStep(0)}>Back to evidence</button></div> : <div className="review-layout"><div className="message-list">{messages.map((m, i) => <article className={`message-card ${selectedId === m.id ? 'selected' : ''}`} key={m.id} onClick={() => setSelectedId(m.id)}><div className="message-head"><span className="message-number">{String(i + 1).padStart(2, '0')}</span><span className="sender">{m.sender}</span><span className="strength-pill">{STRENGTH_LABELS[evidenceStrengthForMessage(m)]}</span>{m.exhibitNumber && <span className="exhibit-pill">Exhibit {m.exhibitNumber}</span>}{m.time && <span className="message-time"><Clock3 size={11}/>{m.time}</span>}<span className={`verified-pill ${m.verified ? 'verified' : ''}`}>{m.verified ? <><Check size={11}/> Reviewed</> : 'Needs review'}</span></div><textarea value={m.text} rows={Math.min(5, Math.max(2, Math.ceil(m.text.length / 82)))} onClick={(e) => e.stopPropagation()} onChange={(e) => updateMessage(m.id, { text: e.target.value })} aria-label={`Message ${i + 1} text`}/><div className="message-actions"><button className="text-button" onClick={(e) => { e.stopPropagation(); setSelectedId(m.id); setRedactionOpen(true); }}><Eye size={13}/> Inspect source</button><button className={`text-button refusal-action ${m.role === 'refusal' ? 'is-confirmed' : ''}`} onClick={(e) => { e.stopPropagation(); markRefusal(m.id); }}><Flag size={12}/>{m.role === 'refusal' ? t('refusalPin', language) : t('refusalButton', language)}</button><button className={`text-button ${m.verified ? 'is-confirmed' : ''}`} onClick={(e) => { e.stopPropagation(); setMessages((prev) => prev.map((x) => x.id === m.id ? { ...x, verified: !x.verified } : x)); }}>{m.verified ? <CheckCircle2 size={13}/> : <Check size={13}/>} {m.verified ? 'Reviewed' : 'Mark reviewed'}</button></div></article>)}</div>
              <aside className="review-aside"><div className="aside-title"><ShieldCheck size={16}/><strong>Privacy review</strong></div><p className="aside-copy">Basic phone and email patterns can be masked in the preview. Always check names, addresses, handles, and context manually.</p><label className="toggle-row"><span><strong>Mask phone & email patterns</strong><small>Local preview only</small></span><input type="checkbox" checked={useRedaction} onChange={(e) => setUseRedaction(e.target.checked)}/></label><button className="button button-outline full-width" onClick={() => setRedactionOpen((v) => !v)}>{redactionOpen ? 'Hide' : 'Show'} redacted preview <ChevronDown size={14}/></button>{redactionOpen && <pre className="redaction-preview">{redactedText || 'No transcript loaded.'}</pre>}<div className="hash-box"><Fingerprint size={14}/><div><strong>Evidence fingerprint</strong><p>{hashStatus}</p><code>{evidence.find((e) => e.kind === 'transcript')?.hash || 'Import or paste to calculate a hash'}</code></div></div></aside></div>}
          <EvidenceTimeline messages={messages} onSelect={(id) => { setSelectedId(id); const message = messages.find((item) => item.id === id); if (message?.cropDataUrl) setNotice(`Source preview selected: Exhibit ${message.exhibitNumber || 'pending'}.`); }} language={language}/>
          <div className="divider-line"/><div className="section-title"><div><h2>Guided fact review</h2><p>Answer a few clear questions instead of relying on sample-specific keywords.</p></div><span className="section-step">02 / CONFIRM</span></div>
          <GuidedQuestionnaire messages={messages} answers={questionnaireAnswers} onChange={setQuestionAnswer} onGenerate={generateQuestionnaireFacts} language={language}/>
          <div className="analysis-actions"><div className="demo-ai-box"><div className="demo-ai-head"><Sparkles size={14}/><div><strong>Optional AI demo</strong><small>Synthetic conversations only</small></div></div><label className="consent-line"><input type="checkbox" checked={syntheticConsent} onChange={(e) => setSyntheticConsent(e.target.checked)} disabled={!isSynthetic}/> I confirm this is synthetic test data only.</label><button className="button button-primary" onClick={runDemoAI} disabled={!isSynthetic || !syntheticConsent || busy}>{busy ? 'Analysing…' : 'Analyse synthetic example'} <ArrowRight size={14}/></button>{!isSynthetic && <small className="muted-note">Use “Load synthetic example” on the Evidence step. Never send real case data to an unpaid AI API.</small>}</div></div>
          {analysisResult && <div className="ai-result-note"><Sparkles size={14}/><div><strong>{analysisResult.engine === 'gemini' ? 'Synthetic AI suggestions received' : 'Rule-based fallback suggestions received'}</strong><p>{analysisResult.disclaimer}</p></div></div>}
          <div className="facts-list">{confirmedFacts.map((fact, i) => <article className="fact-card" key={fact.id}><div className="fact-top"><span className="fact-index">FACT {String(i + 1).padStart(2, '0')}</span><span className={`source-label ${fact.source?.includes('AI') ? 'source-ai' : ''}`}>{fact.source || 'Manual'}</span></div><div className="fact-fields"><label>Category<select value={fact.tag} onChange={(e) => updateFact(fact.id, { tag: e.target.value, label: TAGS.find((t) => t.id === e.target.value)?.label || e.target.value })}>{TAGS.map((tag) => <option value={tag.id} key={tag.id}>{tag.label}</option>)}</select></label><label>Fact summary<textarea rows={2} value={fact.summary} onChange={(e) => updateFact(fact.id, { summary: e.target.value })}/></label></div><blockquote><Quote size={14}/><span>{fact.quote || 'No source quote available'}</span>{fact.sourceIds.some((sourceId) => messages.some((message) => message.id === sourceId)) && <button className="text-button" onClick={() => setSelectedId(fact.sourceIds[0])}><Link2 size={12}/> Source</button>}</blockquote>{!fact.sourceIds.some((sourceId) => messages.some((message) => message.id === sourceId)) && <label className="fact-source-link">Link a supporting message<select value="" onChange={(e) => linkFactSource(fact.id, e.target.value)}><option value="">Choose source…</option>{messages.map((message, messageIndex) => <option key={message.id} value={message.id}>{String(messageIndex + 1).padStart(2, '0')} · {message.sender}: {message.text.slice(0, 68)}</option>)}</select></label>}<div className="fact-bottom"><label className="confirm-fact"><input type="checkbox" checked={fact.confirmed} onChange={(e) => toggleFact(fact.id, e.target.checked)} disabled={!messages.every((m) => m.verified) || !fact.sourceIds.some((sourceId) => messages.some((message) => message.id === sourceId))}/> I confirm this fact is supported by the transcript</label><button className="icon-button danger-icon" onClick={() => setConfirmedFacts((prev) => prev.filter((f) => f.id !== fact.id))} aria-label="Delete fact"><Trash2 size={14}/></button></div></article>)}
            <button className="add-fact" onClick={addManualFact} disabled={!messages.length}><Plus size={15}/> Add a fact manually</button>
          </div>
          <div className="bottom-actions"><button className="button button-outline" onClick={() => setStep(0)}><ArrowLeft size={14}/> Back</button><button className="button button-primary" onClick={() => goStep(2)} disabled={!messages.length || !messages.every((m) => m.verified)}>Continue to action plan <ArrowRight size={14}/></button></div>
        </section>}

        {step === 2 && <section className="step-content">
          <div className="plan-intro card"><span className="plan-intro-icon"><HeartHandshake size={19}/></span><div><h2>Options, not instructions.</h2><p>These are starting points, not legal advice or a determination that an offence occurred. Choose only what feels appropriate and safe for your situation.</p></div></div>
          <div className="section-title"><div><h2>Your confirmed facts</h2><p>Only facts you explicitly confirmed appear below.</p></div><button className="text-button" onClick={() => setStep(1)}><RotateCcw size={13}/> Edit review</button></div>
          {confirmed.length ? <div className="confirmed-summary">{confirmed.map((fact) => <button key={fact.id} className={`confirmed-fact-chip ${selectedId === fact.sourceIds[0] ? 'active' : ''}`} onClick={() => { setSelectedId(fact.sourceIds[0]); setStep(1); }}><CheckCircle2 size={13}/>{fact.label}<ChevronRight size={13}/></button>)}</div> : <div className="empty-facts card"><CircleAlert size={18}/><div><strong>No facts confirmed yet</strong><p>Return to Review and confirm only facts supported by the transcript. You can still read the general reporting routes below.</p></div><button className="button button-outline button-small" onClick={() => setStep(1)}>Review facts</button></div>}
          <div className="danger-check card"><label><input type="checkbox" checked={immediateDanger} onChange={(e) => setImmediateDanger(e.target.checked)}/><span><strong>Is there immediate physical danger right now?</strong><small>Only select this if it applies and it is safe to answer.</small></span></label></div>
          <ProtectNow tags={confirmedTags} language={language} compact/>
          <div className="section-title"><div><h2>Recommended for this case</h2><p>Specialist options appear only when confirmed tags match.</p></div><span className="section-step">03 / GUIDANCE</span></div>
          {confirmed.length === 0 && <div className="routing-hint"><CircleAlert size={15}/><span>Confirm a fact to unlock more tailored options. General online-abuse reporting routes are shown below.</span></div>}
          <div className="routes-grid">{relevantRoutes.map((route) => { const Icon = route.icon; const routeHref = route.id === 'platform' ? platformHelp?.url : route.link; const routeDescription = route.id === 'platform' && platformHelp ? `Official help centre for reporting content or accounts on ${platformHelp.label}.` : route.description; const routeAction = route.id === 'platform' && platformHelp?.url ? `Open ${platformHelp.label} help` : route.id === 'platform' ? 'Choose a platform above' : route.action; return <article className="route-card" key={route.id}><div className="route-card-top"><div className="route-icon"><Icon size={18}/></div>{route.tags && <span className="route-match">Case match</span>}</div><h3>{route.id === 'platform' && platformHelp ? `${platformHelp.label} reporting` : route.title}</h3><p>{routeDescription}</p>{route.reason && <small className="route-reason">{route.reason}</small>}{routeHref ? <a href={routeHref} target="_blank" rel="noreferrer" className="route-link">{routeAction}<ExternalLink size={13}/></a> : <span className="route-link muted-link">{routeAction}</span>}{route.id === 'financial' && <a href="tel:1930" className="route-link call-route">Call 1930 <ArrowUpRight size={13}/></a>}{route.id === 'emergency' && <a href="tel:112" className="route-link call-route">Call 112 <ArrowUpRight size={13}/></a>}</article>; })}</div>
          <div className="legal-note"><BookOpen size={16}/><div><strong>Legal references are intentionally not auto-assigned</strong><p>This prototype does not decide which law applies. Record the facts first and seek qualified help for legal interpretation. Unverified legal sections are not included in the report.</p></div></div>
          <div className="bottom-actions"><button className="button button-outline" onClick={() => setStep(1)}><ArrowLeft size={14}/> Back to review</button><button className="button button-primary" onClick={() => setStep(3)}>Prepare report <ArrowRight size={14}/></button></div>
        </section>}

        {step === 3 && <section className="step-content">
          <div className="export-top"><div><div className="eyebrow">REPORT BUILDER</div><h2>One confirmed case. Clear outputs.</h2><p>Pick a report. Select the transcript or original screenshots only if you want to include them.</p></div><button className="button button-primary" onClick={exportPdf}><Download size={14}/> Print / Save PDF</button></div>
          <div className="report-switch"><button className={reportType === 'complaint' ? 'active' : ''} onClick={() => setReportType('complaint')}><FileText size={14}/> Complaint draft</button><button className={reportType === 'platform' ? 'active' : ''} onClick={() => setReportType('platform')}><MessageSquareText size={14}/> Platform report</button></div>
          <div className="export-includes card"><div><strong>Choose what goes in your PDF</strong><small>Nothing is sent to HerNest by exporting. You share the downloaded file yourself. Phone/email masking is partial; check names and handles.</small></div><label><input type="checkbox" checked={includeTranscriptPdf} onChange={(e) => setIncludeTranscriptPdf(e.target.checked)}/> Include reviewed transcript extract</label><label><input type="checkbox" checked={includeExhibitsPdf} onChange={(e) => setIncludeExhibitsPdf(e.target.checked)}/> Attach cropped exhibits (recommended)</label><label><input type="checkbox" checked={includeScreenshotsPdf} onChange={(e) => setIncludeScreenshotsPdf(e.target.checked)}/> Attach original screenshots <b>(not redacted)</b></label><p className="full-shot-warning">{t('fullScreenshotWarning', language)}</p></div>
          <div className="report-workspace"><div className="report-preview card"><div className="report-paper"><div className="paper-header"><img src="/assets/hernest-wordmark-transparent.png" alt="HerNest"/><span>DRAFT · FOR REVIEW</span></div><div className="paper-rule"/><h2>{reportType === 'complaint' ? 'Complaint Draft' : 'Platform Abuse Report'}</h2><p className="paper-intro">Prepared from user-reviewed material. Please verify all dates, descriptions and attachments before sharing.</p><div className="paper-meta"><div><span>CASE</span><strong>{quoteForOutput(caseTitle)}</strong></div><div><span>PREPARED</span><strong>{new Date().toLocaleDateString('en-IN')}</strong></div><div><span>CONFIRMED FACTS</span><strong>{confirmed.length}</strong></div></div><h3>{reportType === 'complaint' ? 'Statement of facts' : 'Description of reported content'}</h3>{confirmed.length ? confirmed.map((fact, i) => <button className={`claim-row ${selectedId === fact.sourceIds[0] ? 'active' : ''}`} key={fact.id} onClick={() => setSelectedId(fact.sourceIds[0])}><span className="claim-number">{String(i + 1).padStart(2, '0')}</span><span><strong>{quoteForOutput(fact.summary)}</strong>{fact.quote && <small>“{quoteForOutput(fact.quote)}”</small>}{sourceForFact(fact)?.exhibitNumber && <small className="exhibit-citation">Exhibit {sourceForFact(fact).exhibitNumber}</small>}</span><Link2 size={13}/></button>) : <div className="empty-report">No confirmed facts yet. Go to Review to confirm at least one supported fact.</div>}<h3>{reportType === 'complaint' ? 'Request' : 'Requested platform action'}</h3><p>{reportType === 'complaint' ? 'I request that the relevant authority review the above information and advise on appropriate next steps. The attached evidence index identifies the source material available for review.' : 'Please review the reported content/account under your applicable safety and abuse policies and inform me about available protective actions.'}</p><h3>Evidence index</h3>{evidence.length ? evidence.map((item) => <div className="evidence-index-row" key={item.id}><FileText size={12}/><span>{item.name}</span><code>{item.hash.slice(0, 20)}…</code></div>) : <p>No evidence files indexed.</p>}<div className="paper-footer">HerNest creates an editable draft, not a legally certified document. Verify all content before sharing.</div></div></div>
            <aside className="source-panel card"><div className="source-panel-head"><div><span className="eyebrow">PROVENANCE</span><h3>Supporting source</h3></div><span className="source-count">{messages.length} msgs</span></div>{selectedMessage ? <><div className="source-message-card"><div className="source-message-meta"><span>MESSAGE {String(messages.findIndex((m) => m.id === selectedMessage.id) + 1).padStart(2, '0')}</span><span>{selectedMessage.time || 'Time not provided'}</span></div><strong>{selectedMessage.sender}</strong><p>{selectedMessage.text}</p><span className={`verified-pill ${selectedMessage.verified ? 'verified' : ''}`}>{selectedMessage.verified ? 'Reviewed source' : 'Not yet reviewed'}</span></div>{(() => { const sourceImage = evidence.find((e) => e.id === selectedMessage.evidenceId && e.kind === 'image' && e.url); return sourceImage ? <div className="source-image-box"><div className="source-image-frame"><img src={sourceImage.url} alt={`Original screenshot source ${sourceImage.name}`}/>{(selectedMessage.sourceBox || selectedMessage.sourceLine) && sourceImage.imageWidth && sourceImage.imageHeight && <span className="ocr-source-highlight" style={{ left: `${((selectedMessage.sourceBox || selectedMessage.sourceLine).x0 / sourceImage.imageWidth) * 100}%`, top: `${((selectedMessage.sourceBox || selectedMessage.sourceLine).y0 / sourceImage.imageHeight) * 100}%`, width: `${(((selectedMessage.sourceBox || selectedMessage.sourceLine).x1 - (selectedMessage.sourceBox || selectedMessage.sourceLine).x0) / sourceImage.imageWidth) * 100}%`, height: `${(((selectedMessage.sourceBox || selectedMessage.sourceLine).y1 - (selectedMessage.sourceBox || selectedMessage.sourceLine).y0) / sourceImage.imageHeight) * 100}%` }} aria-label="Exact selected OCR crop region"/>}</div><small>{selectedMessage.sourceBox ? 'Exact selected crop · original screenshot, not redacted' : selectedMessage.sourceLine ? 'Source text region · original screenshot, not redacted' : 'OCR source image · original, not redacted'}</small></div> : null; })()}<button className="button button-outline full-width" onClick={() => setStep(1)}><Eye size={14}/> Review source message</button></> : <p className="muted-note">No source selected.</p>}<div className="source-list-title">CONFIRMED CLAIMS</div>{confirmed.map((fact, i) => <button className={`source-claim ${selectedId === fact.sourceIds[0] ? 'active' : ''}`} key={fact.id} onClick={() => setSelectedId(fact.sourceIds[0])}><span>{String(i + 1).padStart(2, '0')}</span><strong>{fact.summary}</strong><ChevronRight size={13}/></button>)}</aside></div>
          <div className="report-actions"><button className="button button-outline" onClick={() => setStep(2)}><ArrowLeft size={14}/> Back to action plan</button><button className="button button-primary" onClick={exportPdf}><Download size={14}/> Export PDF <ArrowRight size={14}/></button></div>
          <div className="print-report"><div className="print-brand"><img src="/assets/hernest-wordmark-transparent.png" alt="HerNest"/></div><h1>{reportType === 'complaint' ? 'Complaint Draft' : 'Platform Abuse Report'}</h1><p><strong>Case:</strong> {quoteForOutput(caseTitle)}</p>{platformHelp && <p><strong>Platform:</strong> {platformHelp.label}</p>}<p><strong>Prepared:</strong> {new Date().toLocaleDateString('en-IN')}</p><h2>{t('reportFacts', language)}</h2>{confirmed.length ? confirmed.map((f, i) => <div className="print-fact" key={f.id}><p><strong>{i + 1}. {quoteForOutput(f.summary)}</strong></p><blockquote>{quoteForOutput(f.quote)}</blockquote><p>Source: {quoteForOutput(sourceForFact(f)?.sender || 'Unlinked source')} {sourceForFact(f)?.time ? `· ${sourceForFact(f).time}` : ''}{sourceForFact(f)?.exhibitNumber ? ` · Exhibit ${sourceForFact(f).exhibitNumber}` : ''} · Strength: {evidenceStrengthForMessage(sourceForFact(f))}</p></div>) : <p>No facts confirmed.</p>}{timelineFact && <><h2>Sequence after refusal</h2><p>{quoteForOutput(timelineFact)}</p></>}<h2>{t('reportRequested', language)}</h2><p>{reportType === 'complaint' ? 'I request that the relevant authority review the above information and advise on appropriate next steps.' : 'Please review the reported content/account under your applicable safety and abuse policies.'}</p>{includeTranscriptPdf && <><h2>Reviewed transcript extract</h2>{messages.map((m, i) => <div className="print-fact" key={m.id}><p><strong>{String(i + 1).padStart(2, '0')} · {m.sender}{m.time ? ` · ${m.time}` : ''}</strong></p><blockquote>{quoteForOutput(m.text)}</blockquote><p>Transcript reviewed: {m.verified ? 'Yes' : 'No'}</p></div>)}</>}{includeExhibitsPdf && exhibitIndex.length > 0 && <><h2>{t('exhibitIndex', language)}</h2>{exhibitIndex.map((exhibit) => <div className="print-exhibit" key={exhibit.messageId}><h3>Exhibit {exhibit.exhibitNumber}</h3><p><strong>Source file:</strong> {quoteForOutput(exhibit.sourceFileName)}<br/><strong>Source file SHA-256:</strong> <code>{exhibit.sourceFileHash}</code><br/><strong>Crop SHA-256:</strong> <code>{exhibit.cropHash}</code><br/><strong>Region:</strong> {exhibit.sourceBox ? `${exhibit.sourceBox.x0},${exhibit.sourceBox.y0} – ${exhibit.sourceBox.x1},${exhibit.sourceBox.y1} px` : 'Unavailable'}<br/><strong>Captured by:</strong> {exhibit.captureMethod}<br/><strong>Evidence strength:</strong> {exhibit.strength}</p><blockquote>{quoteForOutput(exhibit.text)}</blockquote><img className="print-crop-exhibit" src={exhibit.cropDataUrl} alt={`Cropped exhibit ${exhibit.exhibitNumber}`}/></div>)}</>}<p className="print-disclaimer">{t('integrityNote', language)}</p>{includeScreenshotsPdf && evidence.filter((ev) => ev.kind === 'image' && ev.url).map((ev) => <div className="print-image-attachment" key={ev.id}><h2>Original screenshot attachment: {ev.name}</h2><p>Warning: this is the original image and has not been redacted by HerNest.</p><img src={ev.url} alt={`Original attachment ${ev.name}`}/></div>)}<h2>{t('reportIndex', language)}</h2>{evidence.map((ev) => <p key={ev.id}><strong>{quoteForOutput(ev.name)}</strong><br/><code>{ev.hash}</code><br/>Added to this tool: {new Date(ev.addedAt).toLocaleString()}</p>)}<hr/><p className="print-disclaimer">This is an editable draft generated from user-confirmed facts. Hashes support file-integrity checking but do not establish authenticity or the original capture time. This is not legal advice or a certified chain of custody.</p></div>
        </section>}
        <footer className="page-footer"><span><LockKeyhole size={12}/> HerNest does not replace emergency services or legal advice.</span><span>Made for safer next steps <span className="footer-heart">♥</span></span></footer>
      </div>
    </main>
    {cropTarget && <CropOcrTool item={cropTarget} onMessage={handleCroppedMessage} onClose={() => setCropTarget(null)} preferredOcrLanguage={preferredOcrLanguage} />}
  </div>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
