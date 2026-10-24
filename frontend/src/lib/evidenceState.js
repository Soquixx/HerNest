export function appendOcrMessage(existingMessages, newMessage) {
  const current = Array.isArray(existingMessages) ? existingMessages : [];
  if (!newMessage?.id || current.some((message) => message.id === newMessage.id)) return current;
  return [...current, newMessage];
}

export function appendOcrSegment(evidenceItems, newMessage) {
  const current = Array.isArray(evidenceItems) ? evidenceItems : [];
  if (!newMessage?.evidenceId || !newMessage?.id) return current;
  return current.map((item) => {
    if (item.id !== newMessage.evidenceId || item.kind !== 'image') return item;
    const segments = item.ocrSegments || [];
    if (segments.some((segment) => segment.messageId === newMessage.id)) return item;
    return {
      ...item,
      ocrDone: true,
      ocrSegments: [...segments, {
        messageId: newMessage.id,
        text: newMessage.text,
        sourceBox: newMessage.sourceBox,
        side: newMessage.side,
      }],
    };
  });
}
