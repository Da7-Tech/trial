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

function runArgs(cwd, args) {
  return execFileSync('node', [installer, ...args], { cwd, encoding: 'utf8' });
}

test('symlinked destinations are refused and the link target is untouched', () => {
  if (process.platform === 'win32') return;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trial-sym-'));
  const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'trial-sym2-'));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'trial-victim-'));
  const victim = path.join(outside, 'victim.md');
  // Contains the signature on purpose: without the lstat guard the dedicated
  // branch would treat the link target as Trial-managed and overwrite it.
  const original = 'IMPORTANT external file\nquotes "Trial — Pre-Delivery Evidence Gate"\n';
  fs.writeFileSync(victim, original);

  fs.mkdirSync(path.join(dir, '.cursor', 'rules'), { recursive: true });
  fs.symlinkSync(victim, path.join(dir, '.cursor', 'rules', 'trial.mdc'));
  assert.throws(() => run(dir, 'cursor'), /Command failed/, 'symlinked dedicated dest must be refused');
  assert.throws(() => runArgs(dir, ['cursor', '--force']), /Command failed/, '--force must not write through a symlink');

  fs.symlinkSync(victim, path.join(dir2, 'AGENTS.md'));
  assert.throws(() => run(dir2, 'codex'), /Command failed/, 'symlinked append dest must be refused');

  assert.strictEqual(fs.readFileSync(victim, 'utf8'), original, 'external file untouched');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.rmSync(dir2, { recursive: true, force: true });
  fs.rmSync(outside, { recursive: true, force: true });
});

test('a destination directory resolving outside the project is refused', () => {
  if (process.platform === 'win32') return;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trial-symdir-'));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'trial-outside-'));
  fs.symlinkSync(outside, path.join(dir, '.cursor'));
  assert.throws(() => run(dir, 'cursor'), /Command failed/, 'symlinked parent dir must be refused');
  assert.strictEqual(fs.readdirSync(outside).length, 0, 'nothing created outside the project');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.rmSync(outside, { recursive: true, force: true });
});

test('malformed or duplicated markers stop the installer instead of guessing', () => {
  const cases = [
    ['begin with no end', '<!-- trial:begin -->\nold body\n'],
    ['end before begin', '<!-- trial:end -->\nnoise\n<!-- trial:begin -->\n'],
    ['duplicated pairs', '<!-- trial:begin -->\na\n<!-- trial:end -->\n<!-- trial:begin -->\nb\n<!-- trial:end -->\n'],
    ['stray begin above a real pair', 'HEAD\n<!-- trial:begin -->\nPRECIOUS\n<!-- trial:begin -->\nold\n<!-- trial:end -->\nTAIL\n'],
  ];
  for (const [label, content] of cases) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trial-marker-'));
    fs.writeFileSync(path.join(dir, 'AGENTS.md'), content);
    let err;
    try { run(dir, 'codex'); } catch (e) { err = e; }
    assert.ok(err, `${label}: exits non-zero`);
    assert.match(String(err.stderr || ''), /malformed Trial markers/, `${label}: names the problem`);
    assert.strictEqual(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), content, `${label}: file untouched`);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('dedicated update keeps a .bak of the replaced content', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trial-bak-'));
  const dest = path.join(dir, '.cursor', 'rules', 'trial.mdc');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  // A personal file that merely QUOTES the signature is treated as
  // Trial-managed by the substring test; the .bak is its safety net.
  const personal = '# My notes\nabout the "Trial — Pre-Delivery Evidence Gate" idea\nirreplaceable prose\n';
  fs.writeFileSync(dest, personal);
  const out = run(dir, 'cursor');
  assert.match(out, /saved to .*trial\.mdc\.bak/, 'update announces the backup');
  assert.strictEqual(fs.readFileSync(`${dest}.bak`, 'utf8'), personal, 'backup holds the replaced content');
  assert.match(fs.readFileSync(dest, 'utf8'), /# Trial/, 'rule installed');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('--update is rejected as unknown instead of silently forcing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trial-upd-'));
  const dest = path.join(dir, '.cursor', 'rules', 'trial.mdc');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, '# my own file, no signature\n');
  let err;
  try { runArgs(dir, ['cursor', '--update']); } catch (e) { err = e; }
  assert.ok(err, 'exits non-zero');
  assert.match(String(err.stderr || ''), /Unknown option/, 'names the bad flag');
  assert.strictEqual(fs.readFileSync(dest, 'utf8'), '# my own file, no signature\n', 'file preserved');
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
