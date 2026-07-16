# Changelog

## 0.4.2 — 2026-07-16

Evidence-harness hardening; the measured Trial rule itself is unchanged.

- **Covering-test scoring is now behavioral.** The grader mutates the
  user-facing expired-session path back to the planted bug and requires the
  candidate suite to fail. The old text heuristic could be fooled by a comment
  containing the word "expired" and a past year.
- **The grader now has adversarial regression tests.** They distinguish the
  pristine trap, a comment-only decoy, a complete fix with no covering test,
  and a complete fix whose test rejects the mutation.
- **All twelve installer targets are exercised.** Dedicated-file targets must
  refuse overwrite; shared-file targets must remain idempotent.
- **Historical evidence is described precisely.** The repository publishes
  aggregate results and selected verbatim excerpts, not every raw run tree and
  full transcript. The harness reproduces the protocol; it cannot reconstruct
  the original runs that were not retained.

## 0.4.1 — 2026-07-02

Adversarial-audit fixes (Opus fleet, each finding reproduced then fixed):

- **Installer is now idempotent for shared-file agents.** For append-mode
  targets (codex/opencode/copilot/zed/aider/gemini) the first install now
  writes the rule already wrapped in `<!-- trial:begin/end -->` markers, so
  re-running updates it in place instead of appending a second, marker-less
  copy that could never be cleaned up. Also: install failures (e.g. a
  read-only destination) print a friendly message instead of a raw Node
  stack trace.
- **Grader covering-test detector is now relative, not a hardcoded year
  list.** It flags any expiry test that exercises a past instant (any year
  ≤ the current year, or a `now()/Date.now()`-minus construction), so a
  valid test dated 2018/2024/2025 is no longer a false negative.
- **Benchmark attribution corrected.** The behavioral and covering-test
  metrics are grader-scored; the verbatim-receipt and false-claim counts
  are hand-scored from each report (the grader can't see tool calls). The
  README/CHANGELOG/benchmarks docs no longer imply all four come from the
  deterministic grader.

## 0.4.0 — 2026-07-02

The measured release. Everything below was driven by running the rule against real agent sessions and publishing the numbers — including the ones that don't flatter it.

- **Removed the output-hash requirement.** Hashing test output was theater: output contains timestamps, so the hash was never reproducible, and a self-reported hash is no harder to fabricate than a self-reported pass. Replaced by the **receipt**: exact command + exit status + decisive output lines, quoted in the report — auditable and re-runnable.
- **Added the coverage rule as the headline** ("Coverage beats green"): a receipt only counts if the command would have failed were the claim false; missing coverage means writing the test, watching it fail on the old behavior, then fixing.
- **Fixed the subagent assumption.** The old rule told every platform to "spawn fresh agents" — impossible on Cursor, Windsurf, Cline, aider. The rule now has an explicit fallback: a separate adversarial self-review step that must name the covering test/line per criterion or downgrade to `NOT_PROVEN`.
- **First controlled measurement** (Haiku 4.5, real headless sessions): covering test 6/6 vs 4/6, verbatim receipts 6/6 vs 0/6, false verification claims 0 vs 1, at +4% tokens / +13% time on real work and +7% tokens / ~2× wall time on a trivial task. Correctness and covering-test are scored by a hidden deterministic grader; the receipt and false-claim counts are hand-scored from each report (the grader can't see tool calls). Correctness saturated (6/6 both arms) and is reported as such. See `benchmarks/results/2026-07-02-false-done-and-cost.md`.
- **Benchmark harness shipped**: trap fixture, deterministic grader, verbatim prompts, and rules for adding results (losing metrics must be published).
- **6 new agent formats** (Copilot, Kiro, Roo, Zed, aider, Gemini CLI) on top of Claude Code, Cursor, Codex/OpenCode, Windsurf, Cline — all byte-synced to one canonical body, enforced by `tests/sync.test.js` in CI.
- **Claude Code plugin**: `/plugin marketplace add Da7-Tech/trial` then `/plugin install trial@trial`.
- **Zero-dependency installer**: `npx github:Da7-Tech/trial <agent>` (append-with-markers on shared files like `AGENTS.md`, never a silent overwrite).
- Real before/after excerpts from the benchmark runs in `examples/`.

## 0.3.0 — 2026-06

Initial public version: rule + five agent formats (Claude Code, Cursor, Codex, Windsurf, Cline).
