# Changelog

## 0.4.0 — 2026-07-02

The measured release. Everything below was driven by running the rule against real agent sessions and publishing the numbers — including the ones that don't flatter it.

- **Removed the output-hash requirement.** Hashing test output was theater: output contains timestamps, so the hash was never reproducible, and a self-reported hash is no harder to fabricate than a self-reported pass. Replaced by the **receipt**: exact command + exit status + decisive output lines, quoted in the report — auditable and re-runnable.
- **Added the coverage rule as the headline** ("Coverage beats green"): a receipt only counts if the command would have failed were the claim false; missing coverage means writing the test, watching it fail on the old behavior, then fixing.
- **Fixed the subagent assumption.** The old rule told every platform to "spawn fresh agents" — impossible on Cursor, Windsurf, Cline, aider. The rule now has an explicit fallback: a separate adversarial self-review step that must name the covering test/line per criterion or downgrade to `NOT_PROVEN`.
- **First controlled measurement** (Haiku 4.5, real headless sessions, deterministic hidden grader): covering test 6/6 vs 4/6, verbatim receipts 6/6 vs 0/6, false verification claims 0 vs 1, at +4% tokens / +13% time on real work and +7% tokens / ~2× wall time on a trivial task. Correctness saturated (6/6 both arms) and is reported as such. See `benchmarks/results/2026-07-02-false-done-and-cost.md`.
- **Benchmark harness shipped**: trap fixture, deterministic grader, verbatim prompts, and rules for adding results (losing metrics must be published).
- **6 new agent formats** (Copilot, Kiro, Roo, Zed, aider, Gemini CLI) on top of Claude Code, Cursor, Codex/OpenCode, Windsurf, Cline — all byte-synced to one canonical body, enforced by `tests/sync.test.js` in CI.
- **Claude Code plugin**: `/plugin marketplace add Da7-Tech/trial` then `/plugin install trial@trial`.
- **Zero-dependency installer**: `npx github:Da7-Tech/trial <agent>` (append-with-markers on shared files like `AGENTS.md`, never a silent overwrite).
- Real before/after transcripts from the benchmark runs in `examples/`.

## 0.3.0 — 2026-06

Initial public version: rule + five agent formats (Claude Code, Cursor, Codex, Windsurf, Cline).
