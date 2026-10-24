import React from 'react';
import { CircleHelp, Link2 } from 'lucide-react';
import { QUESTIONNAIRE } from '../lib/questionnaire.js';

export default function GuidedQuestionnaire({ messages, answers, onChange, onGenerate }) {
  return <div className="guided-questionnaire">
    <div className="questionnaire-intro"><span className="questionnaire-icon"><CircleHelp size={17}/></span><div><strong>Help us understand what happened</strong><p>Answer what you know. Select a source message for each “Yes”; HerNest will not confirm anything automatically.</p></div></div>
    <div className="questionnaire-grid">
      {QUESTIONNAIRE.map((item, index) => {
        const current = answers[item.id] || { answer: 'unsure', sourceId: '' };
        return <article className="question-card" key={item.id}>
          <div className="question-card-top"><span>QUESTION {String(index + 1).padStart(2, '0')}</span><span>{item.label}</span></div>
          <h4>{item.question}</h4>
          <p>{item.helper}</p>
          <div className="answer-options" role="group" aria-label={item.question}>
            {[['yes','Yes'],['no','No'],['unsure','Not sure']].map(([value,label]) => <button type="button" key={value} className={current.answer === value ? `answer-option active ${value}` : 'answer-option'} onClick={() => onChange(item.id, { ...current, answer: value })}>{label}</button>)}
          </div>
          {current.answer === 'yes' && <label className="question-source"><span><Link2 size={13}/> Supporting source message</span><select value={current.sourceId} onChange={(event) => onChange(item.id, { ...current, sourceId: event.target.value })}><option value="">Choose a message…</option>{messages.map((message, messageIndex) => <option value={message.id} key={message.id}>{String(messageIndex + 1).padStart(2,'0')} · {message.sender}: {message.text.slice(0, 72)}</option>)}</select>{!current.sourceId && <small>Required before this fact can be added.</small>}</label>}
        </article>;
      })}
    </div>
    <div className="questionnaire-actions"><small>Questionnaire answers are user-reported, not legal findings. Review and confirm each generated item.</small><button className="button button-primary" type="button" onClick={onGenerate} disabled={!messages.length}>Create fact drafts</button></div>
  </div>;
}
