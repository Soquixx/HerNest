export function uid(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

// Preserve the trailing clock time as metadata instead of silently discarding it.
export function stripTrailingTime(input = '') {
  const original = String(input).replace(/[\s\u00a0]+$/g, '');
  const match = original.match(/(?:^|[\s\u00a0])((?:Today|Yesterday),?\s+)?(\d{1,2}:\d{2}(?:\s?[ap]\.?m\.?)?)\s*$/i);
  if (!match) return { text: original.trim(), time: '' };
  const time = match[2].replace(/\s+/g, ' ').trim();
  const text = original.slice(0, match.index).trim().replace(/[|·•—–-]+$/g, '').trim();
  return { text, time };
}

// This parser is for text/chat exports only. Never pass screenshot OCR output here.
export function parseChat(raw = '') {
  const result = [];
  const lines = String(raw).split(/\r?\n/).filter((line) => line.trim());
  const wa = /^\[?(\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4},?\s+\d{1,2}:\d{2}(?:\s?[ap]m)?)\]?\s*(?:[-–]\s*)?([^:]+):\s*(.*)$/i;
  const simple = /^([^:\n]{1,45}):\s*(.*)$/;
  for (const original of lines) {
    const line = original.trim();
    const m = line.match(wa);
    if (m) {
      result.push({ id: uid('msg'), time: m[1].trim(), sender: m[2].trim(), text: m[3].trim(), verified: false, sourceType: 'text' });
      continue;
    }
    const simpleMatch = line.match(simple);
    if (simpleMatch) {
      result.push({ id: uid('msg'), time: '', sender: simpleMatch[1].trim(), text: simpleMatch[2].trim(), verified: false, sourceType: 'text' });
      continue;
    }
    if (result.length) result[result.length - 1].text += `\n${line}`;
    else result.push({ id: uid('msg'), time: '', sender: 'Transcript', text: line, verified: false, sourceType: 'text' });
  }
  return result;
}
