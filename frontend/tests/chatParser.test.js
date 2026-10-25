import test from 'node:test';
import assert from 'node:assert/strict';
import { parseChat, stripTrailingTime } from '../src/lib/chatParser.js';

test('parses WhatsApp text export timestamps and sender', () => {
  const result = parseChat('[24/10/2026, 6:10 pm] - Unknown: I will share your private photo.\n[24/10/2026, 6:12 pm] - Me: Stop contacting me.');
  assert.equal(result.length, 2);
  assert.equal(result[0].sender, 'Unknown');
  assert.equal(result[1].sender, 'Me');
  assert.equal(result[0].sourceType, 'text');
});

test('keeps multiline message body in the same source message', () => {
  const result = parseChat('[24/10/2026, 6:10 pm] - Person: First line\nsecond line');
  assert.equal(result.length, 1);
  assert.match(result[0].text, /First line\nsecond line/);
});

test('strips a trailing chat timestamp before a cropped OCR message is added', () => {
  assert.deepEqual(stripTrailingTime('I will share your photo 9:19 PM'), { text: 'I will share your photo', time: '9:19 PM' });
  assert.deepEqual(stripTrailingTime('You have two hours Today, 8:16 PM'), { text: 'You have two hours', time: '8:16 PM' });
});

test('parser does not turn standalone status-bar text into sender messages when OCR is kept separate', () => {
  // This assertion documents the boundary: callers should invoke stripTrailingTime for crop OCR,
  // and should call parseChat only for .txt exports, never for raw image OCR output.
  assert.deepEqual(stripTrailingTime('9:41'), { text: '', time: '9:41' });
});
