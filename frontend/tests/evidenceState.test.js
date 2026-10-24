import test from 'node:test';
import assert from 'node:assert/strict';
import { appendOcrMessage, appendOcrSegment } from '../src/lib/evidenceState.js';

test('OCR message is appended without replacing existing transcript messages', () => {
  const original = [{ id: 'txt-1', text: 'existing one' }, { id: 'txt-2', text: 'existing two' }];
  const crop = { id: 'ocr-1', evidenceId: 'image-1', text: 'cropped message', sourceBox: { x0: 1, y0: 2, x1: 20, y1: 30 }, side: 'them' };
  const next = appendOcrMessage(original, crop);
  assert.deepEqual(next.map((message) => message.id), ['txt-1', 'txt-2', 'ocr-1']);
  assert.equal(original.length, 2);
});

test('OCR provenance segment is appended to matching image and remains idempotent', () => {
  const original = [{ id: 'image-1', kind: 'image', ocrSegments: [{ messageId: 'ocr-0', text: 'first' }] }];
  const crop = { id: 'ocr-1', evidenceId: 'image-1', text: 'second', sourceBox: { x0: 3, y0: 4, x1: 20, y1: 30 }, side: 'me' };
  const once = appendOcrSegment(original, crop);
  assert.equal(once[0].ocrSegments.length, 2);
  assert.deepEqual(once[0].ocrSegments[1].sourceBox, crop.sourceBox);
  const twice = appendOcrSegment(once, crop);
  assert.equal(twice[0].ocrSegments.length, 2);
});
