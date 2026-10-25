export const PROTECT_NOW_ITEMS = [
  { id: 'preserve', text: 'Save evidence before you block or report.' },
  { id: 'dont-delete', text: 'Do not delete the original chats or files.' },
  { id: 'otp-pin', text: 'Never share an OTP, PIN, or password with someone who contacts you unexpectedly.' },
  { id: 'account', text: 'If safe, change passwords, enable two-step login, and review logged-in devices.' },
  { id: 'trusted', text: 'Consider telling one trusted person what is happening.' },
  { id: 'payment', text: 'If someone demands money, pause before paying; payment may lead to further demands.' },
  { id: 'child-images', text: 'If an image involves anyone under 18, do not forward, repost, or circulate it. Use official reporting channels.' },
];

export function getProtectNowItems(tags = new Set()) {
  const set = tags instanceof Set ? tags : new Set(tags || []);
  const items = [...PROTECT_NOW_ITEMS];
  if (set.has('financial_fraud')) items.splice(5, 0, { id: '1930', text: 'If money has already been transferred in a cyber-fraud incident, report it immediately through 1930 or the official cybercrime portal.', link: 'https://cybercrime.gov.in/' });
  return items;
}
