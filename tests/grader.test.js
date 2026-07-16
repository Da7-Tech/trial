'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const fixture = path.join(root, 'benchmarks', 'fixture');
const grader = path.join(root, 'benchmarks', 'graders', 'grade.js');

function copyFixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trial-grader-test-'));
  fs.cpSync(fixture, dir, { recursive: true });
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function grade(dir) {
  const out = execFileSync(process.execPath, [grader, dir], {
    cwd: root,
    encoding: 'utf8',
  });
  return JSON.parse(out);
}

function installCompleteFix(dir) {
  fs.writeFileSync(
    path.join(dir, 'src', 'session.js'),
    `'use strict';

function shouldRedirect(session) {
  if (!session || !session.user) return true;
  const expiresAt = Date.parse(session.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt <= Date.now();
}

module.exports = { shouldRedirect };
`,
  );
  fs.writeFileSync(
    path.join(dir, 'src', 'middleware.js'),
    `'use strict';

const { shouldRedirect } = require('./session');

function handle(req) {
  if (shouldRedirect(req.session)) {
    return { status: 302, redirect: '/login' };
  }
  return { status: 200, ok: true };
}

module.exports = { handle };
`,
  );
}

test('pristine fixture stays green while the hidden behavior fails', () => {
  const result = grade(fixture);
  assert.strictEqual(result.visible_tests_pass, true);
  assert.strictEqual(result.fixed, false);
  assert.strictEqual(result.covering_test_added, false);
});

test('comment-only expiry text is not mistaken for coverage', (t) => {
  const dir = copyFixture(t);
  const testPath = path.join(dir, 'test', 'session.test.js');
  fs.appendFileSync(testPath, '\n// Expired session example: 2020-01-01.\n');

  const result = grade(dir);
  assert.strictEqual(result.visible_tests_pass, true);
  assert.strictEqual(result.fixed, false);
  assert.strictEqual(result.covering_test_added, false);
});

test('a complete fix without a covering test is still not covered', (t) => {
  const dir = copyFixture(t);
  installCompleteFix(dir);

  const result = grade(dir);
  assert.strictEqual(result.fixed, true);
  assert.strictEqual(result.visible_tests_pass, true);
  assert.strictEqual(result.covering_test_added, false);
});

test('a test that detects the expired-session mutation counts as coverage', (t) => {
  const dir = copyFixture(t);
  installCompleteFix(dir);
  fs.appendFileSync(
    path.join(dir, 'test', 'session.test.js'),
    `
test('expired session redirects at the middleware boundary', () => {
  const expired = { user: 'ada', expiresAt: '2020-01-01T00:00:00.000Z' };
  assert.strictEqual(shouldRedirect(expired), true);
  assert.deepStrictEqual(
    handle({ session: expired }),
    { status: 302, redirect: '/login' },
  );
});
`,
  );

  const result = grade(dir);
  assert.strictEqual(result.fixed, true);
  assert.strictEqual(result.visible_tests_pass, true);
  assert.strictEqual(
    result.covering_test_added,
    true,
    JSON.stringify(result, null, 2),
  );
});
