import test from 'node:test';
import assert from 'node:assert/strict';
import { detectBubbleCandidates } from '../src/lib/bubbleDetection.js';

test('bubble detection safely handles empty image data', () => {
  assert.deepEqual(detectBubbleCandidates({ data: new Uint8ClampedArray(0) }, 0, 0), []);
});


test('detects bright chat-like bubbles and assigns left/right roles', () => {
  const width = 160;
  const height = 120;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      data[index] = 245; data[index + 1] = 245; data[index + 2] = 245; data[index + 3] = 255;
    }
  }
  const fill = (x0, y0, x1, y1, color) => {
    for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) {
      const index = (y * width + x) * 4;
      data[index] = color[0]; data[index + 1] = color[1]; data[index + 2] = color[2]; data[index + 3] = 255;
    }
  };
  fill(8, 24, 66, 44, [205, 242, 204]);
  fill(92, 60, 154, 80, [205, 242, 204]);
  const candidates = detectBubbleCandidates({ data }, width, height);
  assert.ok(candidates.some((candidate) => candidate.side === 'them'));
  assert.ok(candidates.some((candidate) => candidate.side === 'me'));
});
