function isOtherPerson(message) {
  if (message?.side === 'me') return false;
  const sender = String(message?.sender || '').trim().toLowerCase();
  return sender !== 'me' && sender !== 'you' && sender !== 'self';
}

export function summarizeAfterRefusal(messages = []) {
  const verified = messages.filter((message) => message.verified);
  const refusalIndex = verified.findIndex((message) => message.role === 'refusal');
  if (refusalIndex < 0) return { refusal: null, count: 0, firstTime: '', lastTime: '', messages: [] };
  const refusal = verified[refusalIndex];
  const after = verified.slice(refusalIndex + 1).filter(isOtherPerson);
  const timeLabel = (message) => [message.screenshotDate, message.time].filter(Boolean).join(' ');
  return {
    refusal,
    count: after.length,
    firstTime: after.length ? timeLabel(after[0]) : '',
    lastTime: after.length ? timeLabel(after[after.length - 1]) : '',
    messages: after,
  };
}

export function refusalTimelineFact(summary) {
  if (!summary?.refusal || !summary.count) return null;
  const refusalTime = [summary.refusal.screenshotDate, summary.refusal.time].filter(Boolean).join(' ');
  const times = summary.firstTime && summary.lastTime
    ? ` from ${summary.firstTime}${summary.lastTime !== summary.firstTime ? ` to ${summary.lastTime}` : ''}`
    : '';
  return `${summary.count} message${summary.count === 1 ? '' : 's'} from the other person follow your message${refusalTime ? ` at ${refusalTime}` : ''}${times}. This is a sequence summary, not a legal conclusion.`;
}
