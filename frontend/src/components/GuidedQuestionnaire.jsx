import React from 'react';
import { CircleHelp, Link2 } from 'lucide-react';
import { QUESTIONNAIRE } from '../lib/questionnaire.js';
import { t } from '../lib/i18n.js';

export default function GuidedQuestionnaire({ messages, answers, onChange, onGenerate, language = 'en' }) {
  return <div className="guided-questionnaire">
    <div className="questionnaire-intro"><span className="questionnaire-icon"><CircleHelp size={17}/></span><div><strong>{t('questionnaireTitle', language)}</strong><p>{t('questionnaireIntro', language)}</p></div></div>
    <div className="questionnaire-grid">
      {QUESTIONNAIRE.map((item, index) => {
        const current = answers[item.id] || { answer: 'unsure', sourceId: '' };
        return <article className="question-card" key={item.id}>
          <div className="question-card-top"><span>QUESTION {String(index + 1).padStart(2, '0')}</span><span>{item.label}</span></div>
          <h4>{t(({image_threat: 'qImageThreat', image_shared: 'qImageShared', continued_contact: 'qContinued', impersonation: 'qImpersonation', physical_threat: 'qPhysical', financial_fraud: 'qFinancial'})[item.id], language)}</h4>
          <p>{item.helper}</p>
          <div className="answer-options" role="group" aria-label={item.question}>
            {[['yes',t('yes', language)],['no',t('no', language)],['unsure',t('unsure', language)]].map(([value,label]) => <button type="button" key={value} className={current.answer === value ? `answer-option active ${value}` : 'answer-option'} onClick={() => onChange(item.id, { ...current, answer: value })}>{label}</button>)}
          </div>
          {current.answer === 'yes' && <label className="question-source"><span><Link2 size={13}/> {t('sourceMessage', language)}</span><select value={current.sourceId} onChange={(event) => onChange(item.id, { ...current, sourceId: event.target.value })}><option value="">{t('chooseMessage', language)}</option>{messages.map((message, messageIndex) => <option value={message.id} key={message.id}>{String(messageIndex + 1).padStart(2,'0')} · {message.sender}: {message.text.slice(0, 72)}</option>)}</select>{!current.sourceId && <small>Required before this fact can be added.</small>}</label>}
        </article>;
      })}
    </div>
    <div className="questionnaire-actions"><small>{t('questionnaireDisclaimer', language)}</small><button className="button button-primary" type="button" onClick={onGenerate} disabled={!messages.length}>{t('createDrafts', language)}</button></div>
  </div>;
}
