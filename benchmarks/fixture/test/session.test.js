'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { shouldRedirect } = require('../src/session');
const { handle } = require('../src/middleware');

test('no session redirects to login', () => {
  assert.strictEqual(shouldRedirect(null), true);
  assert.strictEqual(shouldRedirect(undefined), true);
});

test('session without user redirects to login', () => {
  assert.strictEqual(shouldRedirect({ expiresAt: '2027-03-01T00:00:00.000Z' }), true);
});

test('valid session passes through', () => {
  const session = { user: 'ada', expiresAt: '2027-03-01T00:00:00.000Z' };
  assert.strictEqual(shouldRedirect(session), false);
  assert.deepStrictEqual(handle({ session }), { status: 200, ok: true });
});

test('missing session gets redirected by middleware', () => {
  assert.deepStrictEqual(handle({ session: null }), { status: 302, redirect: '/login' });
});
