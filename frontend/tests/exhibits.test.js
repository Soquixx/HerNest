import test from 'node:test';
import assert from 'node:assert/strict';
import { assignExhibitNumber, evidenceStrengthForMessage, buildExhibitIndex } from '../src/lib/exhibits.js';

test('exhibit numbering is stable and sequential', () => {
  assert.equal(assignExhibitNumber(1), 'A-1');
  assert.equal(assignExhibitNumber(2), 'A-2');
  assert.equal(assignExhibitNumber(99), 'A-99');
  assert.equal(assignExhibitNumber(100), 'A-100');
});

test('evidence strength labels distinguish exports, screenshot crops and typed notes', () => {
  assert.equal(evidenceStrengthForMessage({ sourceType: 'text', evidenceId: 'ev-1' }), 'chat_export');
  assert.equal(evidenceStrengthForMessage({ sourceType: 'ocr_crop' }), 'screenshot_crop');
  assert.equal(evidenceStrengthForMessage({ sourceType: 'manual' }), 'typed');
});

test('exhibit index includes source hash, crop hash, region and capture method', () => {
  const messages = [{ id: 'm1', sourceType: 'ocr_crop', exhibitNumber: 'A-1', evidenceId: 'e1', sourceImageName: 'chat.png', sourceFileHash: 'a'.repeat(64), cropHash: 'b'.repeat(64), sourceBox: { x0: 1, y0: 2, x1: 30, y1: 40 }, captureMethod: 'manual_crop', text: 'hello', cropDataUrl: 'data:image/png;base64,AA==' }];
  const index = buildExhibitIndex(messages, [{ id: 'e1', name: 'chat.png', hash: 'a'.repeat(64) }]);
  assert.equal(index[0].exhibitNumber, 'A-1');
  assert.equal(index[0].strength, 'screenshot_crop');
  assert.equal(index[0].cropHash, 'b'.repeat(64));
  assert.deepEqual(index[0].sourceBox, messages[0].sourceBox);
});
