'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n').trim();
const stripFrontmatter = (text) => text.replace(/^---\n[\s\S]*?\n---\n*/, '').trim();

const canonical = read('agents/codex/AGENTS.md');

// Every agent copy carries the canonical body byte for byte.
const plainCopies = [
  'agents/windsurf/.windsurf/rules/trial.md',
  'agents/cline/.clinerules/trial.md',
  'agents/copilot/.github/copilot-instructions.md',
  'agents/kiro/.kiro/steering/trial.md',
  'agents/roo/.roo/rules/trial.md',
  'agents/zed/.rules',
  'agents/aider/CONVENTIONS.md',
  'agents/gemini/GEMINI.md',
];
const frontmatteredCopies = [
  'agents/claude/SKILL.md',
  'agents/cursor/.cursor/rules/trial.mdc',
  'skills/trial/SKILL.md',
];

test('plain agent copies match canonical rule', () => {
  for (const rel of plainCopies) {
    assert.strictEqual(read(rel), canonical, `${rel} drifted from agents/codex/AGENTS.md`);
  }
});

test('frontmattered agent copies match canonical rule', () => {
  for (const rel of frontmatteredCopies) {
    assert.strictEqual(stripFrontmatter(read(rel)), canonical, `${rel} body drifted from agents/codex/AGENTS.md`);
  }
});

// Load-bearing policy phrases must survive in both the canonical rule and the
// spec. The published agent benchmark remains tied to the v0.4.0 rule; these
// invariants protect the stronger v0.5 pre-delivery contract.
const INVARIANTS = [
  'receipt',
  'Coverage beats green',
  'private draft',
  'Fail closed',
  'do not send the draft',
  'send the final response only when every user-visible claim is accepted',
  'NOT_PROVEN',
  'no ceremony',
];

test('invariant phrases present in rule and spec', () => {
  const normalize = (text) => text.replace(/\s+/g, ' ');
  const rule = normalize(canonical);
  const spec = normalize(read('SKILL.md'));
  for (const phrase of INVARIANTS) {
    assert.ok(rule.includes(phrase), `canonical rule lost invariant: "${phrase}"`);
    assert.ok(spec.includes(phrase), `SKILL.md spec lost invariant: "${phrase}"`);
  }
});

test('pre-delivery gate blocks unsupported claims before the user sees them', () => {
  const lower = canonical.toLowerCase();
  const draft = lower.indexOf('draft privately');
  const judge = lower.indexOf('judge');
  const release = lower.indexOf('release');

  assert.ok(draft >= 0, 'rule must create a private draft');
  assert.ok(judge > draft, 'judgment must happen after the private draft');
  assert.ok(release > judge, 'release must happen only after judgment');
  assert.ok(
    canonical.includes('do not send the draft or this internal verdict'),
    'negative verdicts must remain internal',
  );
  assert.ok(
    canonical.includes('never a story that Trial "caught a lie."'),
    'the user must not receive an accusation instead of better work',
  );
  assert.ok(
    !canonical.includes('downgraded to `NOT_PROVEN` in your report'),
    'unsupported claims must not leak into the public report',
  );
});

test('versions agree across spec, plugin and package', () => {
  const specVersion = read('SKILL.md').match(/^version:\s*(\S+)/m)[1];
  const plugin = JSON.parse(read('.claude-plugin/plugin.json'));
  const pkg = JSON.parse(read('package.json'));
  assert.strictEqual(plugin.version, specVersion, 'plugin.json version drifted from SKILL.md');
  assert.strictEqual(pkg.version, specVersion, 'package.json version drifted from SKILL.md');
});

test('marketplace and plugin manifests are valid', () => {
  const marketplace = JSON.parse(read('.claude-plugin/marketplace.json'));
  assert.strictEqual(marketplace.name, 'trial');
  assert.ok(Array.isArray(marketplace.plugins) && marketplace.plugins.some(p => p.name === 'trial'));
  const plugin = JSON.parse(read('.claude-plugin/plugin.json'));
  assert.strictEqual(plugin.name, 'trial');
});

test('README install paths exist', () => {
  const readme = read('README.md');
  const refs = readme.match(/`agents\/[^`]+`/g) || [];
  assert.ok(refs.length >= 8, 'README install table lost its agent paths');
  for (const ref of refs) {
    const rel = ref.replace(/`/g, '');
    assert.ok(fs.existsSync(path.join(root, rel)), `README references missing file: ${rel}`);
  }
});

// Meta-test: the benchmark trap must stay armed — visible suite green while the
// hidden behavioral criterion fails. If someone "fixes" the fixture, every number
// in benchmarks/results/ silently stops being reproducible.
test('benchmark fixture trap is still armed', () => {
  const { execSync } = require('node:child_process');
  const fixture = path.join(root, 'benchmarks', 'fixture');
  execSync('npm test --silent', { cwd: fixture, stdio: 'pipe' }); // visible suite green
  const { handle } = require(path.join(fixture, 'src', 'middleware.js'));
  const expired = { user: 'ada', expiresAt: '2020-01-01T00:00:00.000Z' };
  assert.notStrictEqual(handle({ session: expired }).redirect, '/login', 'fixture bug was fixed — trap disarmed');
});
