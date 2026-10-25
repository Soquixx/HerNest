import React, { useState } from 'react';
import { Clock3, Flag } from 'lucide-react';
import { summarizeAfterRefusal } from '../lib/timeline.js';
import { t } from '../lib/i18n.js';

export default function EvidenceTimeline({ messages = [], onSelect, language = 'en' }) {
  const summary = summarizeAfterRefusal(messages);
  const [localSelectedId, setLocalSelectedId] = useState('');
  const selected = messages.find((message) => message.id === localSelectedId) || summary.refusal || messages[0];
  if (!messages.length) return null;
  return <section className="evidence-timeline card">
    <div className="timeline-head"><div><span className="eyebrow">CASE SEQUENCE</span><h3>{t('timelineTitle', language)}</h3></div>{summary.count > 0 && <span className="timeline-count">{summary.count} after refusal</span>}</div>
    {!summary.refusal && <p className="timeline-help">{t('timelineNeedsReview', language)}</p>}
    {summary.refusal && summary.count === 0 && <p className="timeline-help">{t('noAfterRefusal', language)}</p>}
    {summary.refusal && summary.count > 0 && <div className="timeline-bracket"><Flag size={13}/><strong>{summary.count} {t('afterRefusal', language)}</strong><small>{[summary.firstTime, summary.lastTime].filter(Boolean).join(' → ')}</small></div>}
    <div className="timeline-list">{messages.map((message, index) => {
      const mine = message.side === 'me' || ['me', 'you', 'self'].includes(String(message.sender || '').toLowerCase());
      const isRefusal = message.role === 'refusal';
      return <button type="button" key={message.id} className={`timeline-item ${mine ? 'mine' : 'theirs'} ${isRefusal ? 'refusal' : ''} ${!message.verified ? 'unreviewed' : ''}`} onClick={() => { setLocalSelectedId(message.id); onSelect(message.id); }}>
        <span className="timeline-marker">{isRefusal ? <Flag size={12}/> : <span/>}</span>
        <span className="timeline-bubble"><small>{String(index + 1).padStart(2, '0')} · {message.sender}{message.time ? ` · ${message.time}` : ''}{message.screenshotDate ? ` · ${message.screenshotDate}` : ''}</small><span>{message.text}</span>{isRefusal && <em>{t('refusalPin', language)}</em>}</span>
      </button>;
    })}</div>
    {selected && <div className="timeline-source-preview"><div><strong>{selected.exhibitNumber ? `Exhibit ${selected.exhibitNumber}` : 'Selected source'}</strong><small>{selected.sourceImageName || (selected.sourceType === 'text' ? 'Chat export / typed transcript' : 'Message source')}</small></div>{selected.cropDataUrl ? <img src={selected.cropDataUrl} alt={`Exact cropped source for ${selected.exhibitNumber || 'message'}`}/> : <blockquote>{selected.text}</blockquote>}</div>}
  </section>;
}
