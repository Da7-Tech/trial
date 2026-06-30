# Trial — Evidence Before Done

> **Don't say done. Prove it.**

Before you write the word **"done"** (or "complete", "finished", "fixed", "shipped") about a task, bind each claim to **executable evidence**: a command you ran plus a hash of its output. A claim with no bound evidence is `NOT_PROVEN`.

> **No "done" without evidence. No evidence without a hash. No escalation unless it's cheaper than the failure it prevents.**

## What to do
1. **Frame** — the real goal, testable acceptance criteria, non-goals.
2. **Build** — do the work.
3. **Collect evidence** — run the tests/build/lint that prove each claim; record the command + hash of output. "Tests passed" with no bound receipt is rejected at zero cost.
4. **Risk-score** — spend on proof proportional to risk. Trivial: run the tests, done. High-stakes: spawn fresh agents to judge independently.
5. **Judge** — for high-risk work, fresh agents (same kind, isolated context) scrutinize the claim and must cite the exact line/test/missing-hash before accepting. Disagreement escalates.
6. **Deliver** — map each acceptance criterion to its evidence. Never ship a known blocker.

## Never rubber-stamp
auth / payments / permissions / user data, DB migration, deletes data, **modifies tests to make them pass**, failed the same task twice, no reproducible evidence. For these, always bring in fresh independent judges.

## Triage FIRST
Default **fast path**: gates inline, verify by running, minutes. Only large/high-stakes work spawns fresh judges. A simple task taking half an hour is a bug, not rigor.

A verdict with no "evidence checked" is invalid. Finish in a time that fits the task.

Full spec: see the repository root `SKILL.md`.
