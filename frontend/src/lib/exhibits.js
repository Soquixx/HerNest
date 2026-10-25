export const STRENGTH_LABELS = {
  chat_export: 'Chat export',
  screenshot_crop: 'Screenshot crop',
  typed: 'Typed note',
};

export function evidenceStrengthForMessage(message) {
  if (message?.evidenceStrength && STRENGTH_LABELS[message.evidenceStrength]) return message.evidenceStrength;
  if (message?.sourceType === 'ocr_crop') return 'screenshot_crop';
  if (message?.sourceType === 'text' && message?.evidenceId) return 'chat_export';
  return 'typed';
}

export function assignExhibitNumber(index) {
  const safe = Math.max(1, Number.isFinite(index) ? Math.floor(index) : 1);
  return `A-${safe}`;
}

export function buildExhibitIndex(messages = [], evidence = []) {
  return messages.filter((message) => message.sourceType === 'ocr_crop' && message.exhibitNumber).map((message) => {
    const source = evidence.find((item) => item.id === message.evidenceId);
    return {
      exhibitNumber: message.exhibitNumber,
      messageId: message.id,
      sourceFileName: message.sourceImageName || source?.name || 'Unknown source file',
      sourceFileHash: message.sourceFileHash || source?.hash || '',
      cropHash: message.cropHash || '',
      sourceBox: message.sourceBox || null,
      captureMethod: message.captureMethod || 'crop OCR',
      strength: evidenceStrengthForMessage(message),
      cropDataUrl: message.cropDataUrl || '',
      text: message.text || '',
    };
  });
}
