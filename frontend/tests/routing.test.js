import test from 'node:test';
import assert from 'node:assert/strict';
import { ROUTE_RULES, getRelevantRoutes } from '../src/lib/routing.js';

test('general routes remain available with no confirmed tags', () => {
  const ids = getRelevantRoutes(ROUTE_RULES, new Set(), false).map((route) => route.id);
  assert.deepEqual(ids, ['cybercrime', 'platform']);
  assert.ok(!ids.includes('emergency'));
});

test('specialist intimate-image route appears only for confirmed actual image misuse', () => {
  const threatOnly = getRelevantRoutes(ROUTE_RULES, new Set(['sextortion']), false).map((route) => route.id);
  assert.ok(!threatOnly.includes('stopncii'));
  const sharedImage = getRelevantRoutes(ROUTE_RULES, new Set(['image_misuse']), false).map((route) => route.id);
  assert.ok(sharedImage.includes('stopncii'));
});

test('emergency route appears only when immediate danger is explicitly selected', () => {
  assert.ok(!getRelevantRoutes(ROUTE_RULES, new Set(['threat']), false).some((r) => r.id === 'emergency'));
  assert.ok(getRelevantRoutes(ROUTE_RULES, new Set(), true).some((r) => r.id === 'emergency'));
});
