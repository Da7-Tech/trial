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

function usage(code) {
  console.log('Usage: npx github:Da7-Tech/trial <agent>');
  console.log('Agents: ' + Object.keys(TARGETS).join(', '));
  process.exit(code);
}

const arg = (process.argv[2] || '').toLowerCase().replace(/^--/, '');
if (!arg || arg === 'help') usage(arg ? 0 : 1);
if (arg === 'list') { console.log(Object.keys(TARGETS).join('\n')); process.exit(0); }
if (!TARGETS[arg]) { console.error(`Unknown agent "${arg}".`); usage(1); }

const [srcRel, destRel, append] = TARGETS[arg];
const src = fs.readFileSync(path.join(pkgRoot, srcRel), 'utf8');
const dest = path.join(process.cwd(), destRel);
fs.mkdirSync(path.dirname(dest), { recursive: true });

if (!fs.existsSync(dest)) {
  fs.writeFileSync(dest, src);
  console.log(`Trial installed: ${destRel}`);
} else if (append) {
  let existing = fs.readFileSync(dest, 'utf8');
  const block = `${BEGIN}\n${src.trim()}\n${END}\n`;
  if (existing.includes(BEGIN)) {
    existing = existing.replace(new RegExp(`${BEGIN}[\\s\\S]*?${END}\\n?`), block);
    fs.writeFileSync(dest, existing);
    console.log(`Trial updated inside existing ${destRel}`);
  } else {
    fs.writeFileSync(dest, existing.trimEnd() + '\n\n' + block);
    console.log(`Trial appended to existing ${destRel}`);
  }
} else {
  console.error(`${destRel} already exists — refusing to overwrite. Remove it first or merge by hand.`);
  process.exit(1);
}
