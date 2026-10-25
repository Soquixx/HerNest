import test from 'node:test';
import assert from 'node:assert/strict';
import { getProtectNowItems } from '../src/lib/protectNow.js';

test('financial fraud guidance adds 1930 only for the matching confirmed tag', () => {
  assert.equal(getProtectNowItems(new Set()).some((item) => item.id === '1930'), false);
  assert.equal(getProtectNowItems(new Set(['financial_fraud'])).some((item) => item.id === '1930'), true);
});

test('baseline safety checklist includes evidence preservation, OTP, trusted person and child-image caution', () => {
  const ids = getProtectNowItems(new Set()).map((item) => item.id);
  for (const id of ['preserve', 'dont-delete', 'otp-pin', 'trusted', 'child-images']) assert.ok(ids.includes(id));
});
