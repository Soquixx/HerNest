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

test('stored exhibit segment keeps the crop hash, date, and exhibit number', () => {
  const source = [{ id: 'image-2', kind: 'image', hash: 'a'.repeat(64), ocrSegments: [] }];
  const crop = {
    id: 'ocr-2', evidenceId: 'image-2', text: 'hello', side: 'me', time: '6:12 PM', screenshotDate: '2026-10-24',
    exhibitNumber: 'A-1', cropHash: 'b'.repeat(64), cropDataUrl: 'data:image/png;base64,AA==', captureMethod: 'manual_crop',
    sourceBox: { x0: 10, y0: 20, x1: 100, y1: 80 }, evidenceStrength: 'screenshot_crop',
  };
  const next = appendOcrSegment(source, crop);
  const segment = next[0].ocrSegments[0];
  assert.equal(segment.exhibitNumber, 'A-1');
  assert.equal(segment.cropHash, 'b'.repeat(64));
  assert.equal(segment.sourceFileHash, 'a'.repeat(64));
  assert.equal(segment.screenshotDate, '2026-10-24');
  assert.deepEqual(segment.sourceBox, crop.sourceBox);
});
