'use strict';

// Regression tests for bin/install.js (adversarial-audit findings).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const installer = path.join(__dirname, '..', 'bin', 'install.js');

const TARGETS = {
  claude: '.claude/skills/trial/SKILL.md',
  cursor: '.cursor/rules/trial.mdc',
  codex: 'AGENTS.md',
  opencode: 'AGENTS.md',
  windsurf: '.windsurf/rules/trial.md',
  cline: '.clinerules/trial.md',
  copilot: '.github/copilot-instructions.md',
  kiro: '.kiro/steering/trial.md',
  roo: '.roo/rules/trial.md',
  zed: '.rules',
  aider: 'CONVENTIONS.md',
  gemini: 'GEMINI.md',
};

const APPEND_TARGETS = new Set([
  'codex',
  'opencode',
  'copilot',
  'zed',
  'aider',
  'gemini',
]);

function run(cwd, arg) {
  return execFileSync('node', [installer, arg], { cwd, encoding: 'utf8' });
}

test('all twelve documented targets install to their advertised paths', () => {
  for (const [agent, rel] of Object.entries(TARGETS)) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `trial-${agent}-`));
    try {
      run(dir, agent);
      const dest = path.join(dir, rel);
      assert.ok(fs.existsSync(dest), `${agent} did not create ${rel}`);
      const first = fs.readFileSync(dest, 'utf8');
      assert.ok(first.includes('# Trial'), `${agent} target lacks the Trial rule`);
      assert.ok(
        first.includes('private draft'),
        `${agent} target lacks the pre-delivery draft gate`,
      );
      assert.ok(
        first.includes('do not send the draft'),
        `${agent} target lacks fail-closed verdict handling`,
      );

      if (APPEND_TARGETS.has(agent)) {
        run(dir, agent);
        const second = fs.readFileSync(dest, 'utf8');
        assert.strictEqual(
          (second.match(/<!-- trial:begin -->/g) || []).length,
          1,
          `${agent} duplicated the managed block`,
        );
      } else {
        // Dedicated-file target: re-running the same version is idempotent
        // (exit 0, content unchanged), not a hard refusal.
        const out = run(dir, agent);
        assert.match(out, /already up to date/, `${agent} same-version reinstall should be idempotent`);
        assert.strictEqual(fs.readFileSync(dest, 'utf8'), first, `${agent} content changed on reinstall`);
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

test('append install is idempotent — re-running never duplicates the rule', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trial-inst-'));
  run(dir, 'codex');                 // first install (append target, no file yet)
  run(dir, 'codex');                 // second
  run(dir, 'codex');                 // third
  const out = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
  const markers = (out.match(/<!-- trial:begin -->/g) || []).length;
  const headings = (out.match(/^# Trial/gm) || []).length;
  assert.strictEqual(markers, 1, 'exactly one marked block after repeated installs');
  assert.strictEqual(headings, 1, 'the rule appears exactly once');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('append install preserves pre-existing user content', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trial-inst-'));
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# My rules\nBe careful.\n');
  run(dir, 'codex');
  const out = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
  assert.ok(out.includes('My rules'), 'user content survives');
  assert.ok(out.includes('<!-- trial:begin -->'), 'rule appended with markers');
  run(dir, 'codex');                 // update-in-place, still one copy
  const out2 = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
  assert.strictEqual((out2.match(/^# Trial/gm) || []).length, 1);
  assert.ok(out2.includes('My rules'));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('dedicated target upgrades a prior Trial version in place', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trial-inst-'));
  const dest = path.join(dir, '.cursor', 'rules', 'trial.mdc');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  // Simulate an older installed Trial version: carries the signature but has
  // stale extra content that the current version does not.
  const current = fs.readFileSync(
    path.join(__dirname, '..', 'agents', 'cursor', '.cursor', 'rules', 'trial.mdc'),
    'utf8',
  );
  fs.writeFileSync(dest, current + '\n<!-- stale 0.4.x remnant -->\n');
  const out = run(dir, 'cursor');
  assert.match(out, /updated/, 'a prior Trial file should update in place');
  assert.strictEqual(fs.readFileSync(dest, 'utf8'), current, 'upgraded file matches current version exactly');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('dedicated target refuses a foreign file but --force overwrites it', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trial-inst-'));
  const dest = path.join(dir, '.cursor', 'rules', 'trial.mdc');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, '# My own cursor rule, nothing to do with Trial\n');

  // Without --force: refuse and preserve the user's file.
  assert.throws(() => run(dir, 'cursor'), /Command failed/, 'foreign file must not be overwritten');
  assert.match(fs.readFileSync(dest, 'utf8'), /My own cursor rule/, 'user content preserved');

  // With --force: overwrite.
  const out = execFileSync('node', [installer, 'cursor', '--force'], { cwd: dir, encoding: 'utf8' });
  assert.match(out, /updated/, '--force should overwrite');
  assert.match(fs.readFileSync(dest, 'utf8'), /Trial — Pre-Delivery Evidence Gate/, 'Trial rule now installed');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('read-only destination fails with a friendly message, not a stack trace', () => {
  if (process.platform === 'win32') return;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trial-inst-'));
  fs.writeFileSync(path.join(dir, 'CONVENTIONS.md'), 'notes\n');
  fs.chmodSync(path.join(dir, 'CONVENTIONS.md'), 0o444);
  let err;
  try { run(dir, 'aider'); } catch (e) { err = e; }
  assert.ok(err, 'exits non-zero');
  const text = String(err.stderr || err.stdout || '');
  assert.ok(/Could not write/.test(text), 'friendly message');
  assert.ok(!/at Object\.<anonymous>/.test(text), 'no raw stack trace');
  fs.rmSync(dir, { recursive: true, force: true });
});
