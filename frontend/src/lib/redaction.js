export function makeRedacted(text = '') {
  return String(text)
    .replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, '[EMAIL REDACTED]')
    .replace(/(?<!\d)(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}(?!\d)/g, '[PHONE REDACTED]');
}
