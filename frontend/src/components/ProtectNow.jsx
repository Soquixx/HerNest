import React from 'react';
import { ShieldCheck, ExternalLink } from 'lucide-react';
import { getProtectNowItems } from '../lib/protectNow.js';
import { t } from '../lib/i18n.js';

export default function ProtectNow({ tags = new Set(), language = 'en', compact = false }) {
  const items = getProtectNowItems(tags);
  const textKey = {
    preserve: 'preserve', 'dont-delete': 'dontDelete', 'otp-pin': 'otpPin', account: 'account',
    trusted: 'trusted', payment: 'payment', 'child-images': 'childImages', '1930': 'financial1930',
  };
  return <details className={`protect-now card ${compact ? 'protect-now-compact' : ''}`}>
    <summary><span className="protect-now-icon"><ShieldCheck size={16}/></span><span><strong>{t('protectTitle', language)}</strong><small>{t('protectIntro', language)}</small></span></summary>
    <ul>{items.map((item) => <li key={item.id}>{t(textKey[item.id] || item.id, language)}{item.link && <> <a href={item.link} target="_blank" rel="noreferrer">Open official portal <ExternalLink size={11}/></a></>}</li>)}</ul>
    <p className="protect-source">Official references: <a href="https://cybercrime.gov.in/" target="_blank" rel="noreferrer">National Cyber Crime Reporting Portal</a> · <a href="https://www.cert-in.org.in/" target="_blank" rel="noreferrer">CERT-In security guidance</a></p>
  </details>;
}
