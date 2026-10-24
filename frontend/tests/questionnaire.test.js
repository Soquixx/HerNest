import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQuestionnaireFacts } from '../src/lib/questionnaire.js';

const messages = [{ id: 'm1', text: 'If you do not pay, I will share the images.', sender: 'Other person' }];

test('requires a source message before creating a user-reported fact', () => {
  assert.equal(buildQuestionnaireFacts({ image_threat: { answer: 'yes', sourceId: '' } }, messages).length, 0);
});

test('creates an unconfirmed fact draft linked to the selected source', () => {
  const facts = buildQuestionnaireFacts({ image_threat: { answer: 'yes', sourceId: 'm1' } }, messages, () => 'f1');
  assert.equal(facts.length, 1);
  assert.equal(facts[0].sourceIds[0], 'm1');
  assert.equal(facts[0].confirmed, false);
  assert.equal(facts[0].userReported, true);
});

test('no and not-sure answers do not create case facts', () => {
  const facts = buildQuestionnaireFacts({ image_threat: { answer: 'no', sourceId: 'm1' }, continued_contact: { answer: 'unsure', sourceId: 'm1' } }, messages);
  assert.equal(facts.length, 0);
});
