export const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', url: 'https://help.instagram.com/547601325292351/' },
  { id: 'whatsapp', label: 'WhatsApp', url: 'https://faq.whatsapp.com/1142481766359885/' },
  { id: 'facebook', label: 'Facebook / Messenger', url: 'https://www.facebook.com/help/' },
  { id: 'x', label: 'X', url: 'https://help.x.com/en/safety-and-security/report-abusive-behavior' },
  { id: 'youtube', label: 'YouTube', url: 'https://support.google.com/youtube/answer/2802027' },
  { id: 'telegram', label: 'Telegram', url: 'https://telegram.org/support' },
  { id: 'other', label: 'Other / multiple platforms', url: '' },
];

export const ROUTE_RULES = [
  { id: 'cybercrime', title: 'National Cyber Crime Portal', short: 'Report online abuse', description: 'Official route for reporting cybercrime in India.', link: 'https://cybercrime.gov.in/', action: 'Open official portal', iconKey: 'globe', general: true, reason: 'Your case concerns online activity.' },
  { id: 'platform', title: 'Report the original post', short: 'Platform reporting', description: 'Report harassment, impersonation, or image misuse on the platform where it happened.', link: '', action: 'Platform help', iconKey: 'message', general: true, reason: 'A report to the platform can help with content review.' },
  { id: 'stopncii', title: 'StopNCII', short: 'Intimate-image support', description: 'For eligible adults with intimate images or videos. It does not accept screenshots of text chats and only works with participating platforms.', link: 'https://stopncii.org/', action: 'Check eligibility', iconKey: 'shield', tags: ['image_misuse'], reason: 'You confirmed a private-image concern; check eligibility carefully.' },
  { id: 'financial', title: 'Financial cyber fraud', short: 'Financial fraud', description: 'The 1930 helpline is specifically associated with reporting online financial fraud in India.', link: 'https://cybercrime.gov.in/', action: 'Review official guidance', iconKey: 'alert', tags: ['financial_fraud'], reason: 'A financial-fraud tag was confirmed.' },
  { id: 'women_support', title: 'Women’s Helpline 181', short: 'Support and One Stop Centres', description: 'The 181 helpline can connect women in distress with support options; local availability may vary.', link: 'https://wcd.gov.in/women/help', action: 'View official support options', iconKey: 'heart', tags: ['sextortion', 'stalking', 'image_misuse', 'threat', 'impersonation'], reason: 'You confirmed a safety or abuse concern where support may be useful.' },
  { id: 'emergency', title: 'Emergency help · 112', short: 'Immediate physical danger', description: 'Show this only when the user indicates immediate physical danger.', link: 'https://112.gov.in/', action: 'Emergency information', iconKey: 'emergency', requiresImmediate: true, reason: 'You indicated immediate physical danger.' },
];

export function getRelevantRoutes(routes, confirmedTags, immediateDanger = false) {
  const tags = confirmedTags instanceof Set ? confirmedTags : new Set(confirmedTags || []);
  return routes.filter((route) => {
    if (route.requiresImmediate) return immediateDanger === true;
    return route.general === true || (route.tags || []).some((tag) => tags.has(tag));
  });
}
