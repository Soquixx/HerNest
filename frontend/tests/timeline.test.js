import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeAfterRefusal, refusalTimelineFact } from '../src/lib/timeline.js';

test('counts verified messages from other person after a refusal and keeps first/last time', () => {
  const messages = [
    { id: '1', sender: 'Other', verified: true, time: '6:10 PM' },
    { id: '2', sender: 'Me', verified: true, role: 'refusal', time: '6:12 PM' },
    { id: '3', sender: 'Other', verified: true, time: '6:15 PM' },
    { id: '4', sender: 'Me', verified: true, time: '6:18 PM' },
    { id: '5', sender: 'Other', verified: true, time: '6:20 PM' },
    { id: '6', sender: 'Other', verified: false, time: '6:25 PM' },
  ];
  const summary = summarizeAfterRefusal(messages);
  assert.equal(summary.count, 2);
  assert.equal(summary.firstTime, '6:15 PM');
  assert.equal(summary.lastTime, '6:20 PM');
  assert.match(refusalTimelineFact(summary), /2 messages from the other person follow your message at 6:12 PM/);
  assert.match(refusalTimelineFact(summary), /not a legal conclusion/);
});

test('does not count messages before refusal or unreviewed messages', () => {
  const summary = summarizeAfterRefusal([
    { id: '1', sender: 'Other', verified: true, time: '1:00 PM' },
    { id: '2', sender: 'Me', verified: true, role: 'refusal', time: '1:01 PM' },
    { id: '3', sender: 'Other', verified: false, time: '1:02 PM' },
  ]);
  assert.equal(summary.count, 0);
});
