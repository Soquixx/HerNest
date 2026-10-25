import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRedacted } from '../src/lib/redaction.js';

test('masks email addresses in preview', () => {
  assert.equal(makeRedacted('Email me at survivor@example.org'), 'Email me at [EMAIL REDACTED]');
});

test('masks Indian mobile number patterns', () => {
  assert.match(makeRedacted('Call +91 98765 43210'), /\[PHONE REDACTED\]/);
});

test('does not claim to remove names or handles', () => {
  assert.equal(makeRedacted('Aanya @campus_01'), 'Aanya @campus_01');
});
