#!/usr/bin/env node
'use strict';
// Zero-dependency installer: copies the Trial rule into the current project
// for the agent you name. Never overwrites silently — existing shared files
// (AGENTS.md, CONVENTIONS.md, ...) get the rule appended between markers.
//
//   npx github:Da7-Tech/trial <agent>
//   npx github:Da7-Tech/trial --list

const fs = require('fs');
const path = require('path');

const pkgRoot = path.join(__dirname, '..');

// agent -> [source in this repo, destination in the user's project, append?]
const TARGETS = {
  claude:   ['agents/claude/SKILL.md', '.claude/skills/trial/SKILL.md', false],
  cursor:   ['agents/cursor/.cursor/rules/trial.mdc', '.cursor/rules/trial.mdc', false],
  codex:    ['agents/codex/AGENTS.md', 'AGENTS.md', true],
  opencode: ['agents/codex/AGENTS.md', 'AGENTS.md', true],
  windsurf: ['agents/windsurf/.windsurf/rules/trial.md', '.windsurf/rules/trial.md', false],
  cline:    ['agents/cline/.clinerules/trial.md', '.clinerules/trial.md', false],
  copilot:  ['agents/copilot/.github/copilot-instructions.md', '.github/copilot-instructions.md', true],
  kiro:     ['agents/kiro/.kiro/steering/trial.md', '.kiro/steering/trial.md', false],
  roo:      ['agents/roo/.roo/rules/trial.md', '.roo/rules/trial.md', false],
  zed:      ['agents/zed/.rules', '.rules', true],
  aider:    ['agents/aider/CONVENTIONS.md', 'CONVENTIONS.md', true],
  gemini:   ['agents/gemini/GEMINI.md', 'GEMINI.md', true],
};

const BEGIN = '<!-- trial:begin -->';
const END = '<!-- trial:end -->';

// Stable signature present in every Trial rule body since 0.3.0. Used to tell a
// Trial-managed dedicated file (safe to update in place) from a user's own file
// that happens to sit at the same path (must not be clobbered).
const TRIAL_SIGNATURE = 'Trial — Pre-Delivery Evidence Gate';

function usage(code) {
  console.log('Usage: npx github:Da7-Tech/trial <agent> [--force]');
  console.log('Agents: ' + Object.keys(TARGETS).join(', '));
  console.log('  --force   overwrite a non-Trial file at the destination path');
  process.exit(code);
}

const rawArgs = process.argv.slice(2);
const force = rawArgs.some((a) => /^--force$/i.test(a));
const unknownFlags = rawArgs.filter((a) => /^--/.test(a) && !/^--(force|help|list)$/i.test(a));
if (unknownFlags.length) {
  console.error(`Unknown option "${unknownFlags[0]}".`);
  usage(1);
}
const positional = rawArgs.filter((a) => !/^--force$/i.test(a));
const arg = (positional[0] || '').toLowerCase().replace(/^--/, '');
if (!arg || arg === 'help') usage(arg ? 0 : 1);
if (arg === 'list') { console.log(Object.keys(TARGETS).join('\n')); process.exit(0); }
if (!TARGETS[arg]) { console.error(`Unknown agent "${arg}".`); usage(1); }

const [srcRel, destRel, append] = TARGETS[arg];
const src = fs.readFileSync(path.join(pkgRoot, srcRel), 'utf8');
const dest = path.join(process.cwd(), destRel);
const block = `${BEGIN}\n${src.trim()}\n${END}\n`;

function fail(message) {
  console.error(message);
  process.exit(1);
}

// The installer must never write outside the project it is run in, and never
// through a symlink: a hostile checkout could pre-plant the destination path
// as a link to a file elsewhere (dotfiles, shared configs) and turn a routine
// `npx … <agent>` into an out-of-tree overwrite.
function assertDestinationConfined() {
  let nearest = path.dirname(dest);
  while (!fs.existsSync(nearest)) nearest = path.dirname(nearest);
  const root = fs.realpathSync(process.cwd());
  const anchor = fs.realpathSync(nearest);
  if (anchor !== root && !anchor.startsWith(root + path.sep)) {
    fail(`${destRel} resolves outside the project directory — refusing to write.`);
  }
  let stats = null;
  try { stats = fs.lstatSync(dest); } catch (_) { /* not created yet */ }
  if (stats && stats.isSymbolicLink()) {
    fail(`${destRel} is a symlink — refusing to write through it. ` +
      'Run the installer where the link points, or replace the link with a regular file.');
  }
}

try {
  assertDestinationConfined();
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  if (!fs.existsSync(dest)) {
    // For append-mode targets, write the FIRST copy already wrapped in
    // markers so a later run updates it in place instead of appending a
    // second, marker-less duplicate that could never be cleaned up.
    fs.writeFileSync(dest, append ? block : src);
    console.log(`Trial installed: ${destRel}`);
  } else if (append) {
    const existing = fs.readFileSync(dest, 'utf8');
    const begins = existing.split(BEGIN).length - 1;
    const ends = existing.split(END).length - 1;
    // A malformed or duplicated marker pair means the managed region cannot be
    // identified safely: updating anyway would either claim success while
    // changing nothing or eat user content straying between the wrong pair.
    // Stop and say so instead of guessing.
    if (begins !== ends || begins > 1 ||
        (begins === 1 && existing.indexOf(END) < existing.indexOf(BEGIN))) {
      fail(`${destRel} has malformed Trial markers (${begins} begin / ${ends} end) — ` +
        'repair or remove them manually, then re-run.');
    }
    if (begins === 1) {
      fs.writeFileSync(dest, existing.replace(new RegExp(`${BEGIN}[\\s\\S]*?${END}\\n?`), block));
      console.log(`Trial updated inside existing ${destRel}`);
    } else {
      fs.writeFileSync(dest, existing.trimEnd() + '\n\n' + block);
      console.log(`Trial appended to existing ${destRel}`);
    }
  } else {
    // Dedicated-file target whose destination already exists. Update in place
    // when it is a Trial-managed file (any prior version carries the
    // signature) so upgrades and same-version reinstalls are idempotent;
    // refuse only a genuinely foreign file so user content is never lost.
    const existing = fs.readFileSync(dest, 'utf8');
    if (existing === src) {
      console.log(`Trial already up to date: ${destRel}`);
    } else if (force || existing.includes(TRIAL_SIGNATURE)) {
      // The signature test can misfire on a personal file that merely quotes
      // it, so every destructive update keeps the replaced content beside the
      // destination as a one-step undo.
      const bak = `${dest}.bak`;
      fs.rmSync(bak, { force: true });
      fs.writeFileSync(bak, existing);
      fs.writeFileSync(dest, src);
      console.log(`Trial updated: ${destRel} (previous content saved to ${destRel}.bak)`);
    } else {
      console.error(`${destRel} already exists and is not a Trial file — refusing to overwrite. ` +
        `Re-run with --force to replace it, or remove it first.`);
      process.exit(1);
    }
  }
} catch (err) {
  // Friendly message instead of a raw Node stack trace (e.g. EACCES on a
  // read-only destination, EISDIR, etc.).
  console.error(`Could not write ${destRel}: ${err.code || err.message}. ` +
    `Check the path is writable, then retry.`);
  process.exit(1);
}
