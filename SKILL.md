---
name: trial
description: "Gated judging that stops false-done: an agent may not claim a task is done until every claim is bound to a receipt — the command it ran, its exit status, and the decisive output — that actually covers the claim. Scrutiny scales with risk. Use for work where a green suite is not enough proof."
version: 0.4.2
license: MIT
---

# Trial — Evidence Before Done

> **Don't say done. Prove it.**

Trial is one rule injected into how an agent finishes work:

> **Every claim of completion is worthless until executable evidence covers it. Spend on that proof in proportion to risk — never more, never less.**

It is a **behavioral skill**: it ships as a rules file, runs with whatever model you already use, and needs no configuration. The full rule the agents actually read is [`agents/codex/AGENTS.md`](agents/codex/AGENTS.md) — every per-agent copy in `agents/` carries the same canonical body, byte for byte (enforced by [`tests/sync.test.js`](tests/sync.test.js)). This file is the spec behind it.

## The failure it targets

Agents routinely say "done — all tests pass" when the suite never exercised the thing they claim to have fixed. The suite is green because it is blind, not because the work is right. We measured exactly this on real headless agent sessions: without Trial, 2 of 6 agents shipped a bug fix for "expired sessions must redirect" **without any test exercising an expired session**, and one of them attributed coverage to the existing tests that they do not have. With Trial, 6 of 6 left a covering test and quoted a verbatim receipt. ([Full method and numbers](benchmarks/results/2026-07-02-false-done-and-cost.md).)

## The receipt

A **receipt** is: the exact command the agent ran, its exit status, and the decisive lines of its output, quoted in the final report.

- A claim with no receipt is `NOT_PROVEN` — the agent rejects it itself, before any judge reads it.
- **Coverage beats green.** A receipt only counts if the command it quotes would have *failed* were the claim false. "All tests pass" from a suite that never exercises the claimed behavior covers nothing. The agent restates the request as an acceptance criterion at the boundary where the user feels it, and if no test exercises that criterion, writes one — watching it fail on the old behavior first when possible.

**What a receipt is not.** A receipt is self-reported; it is not cryptographic proof, and a model determined to fabricate output verbatim can fabricate a receipt too. What it changes is the shape of failure: an agent can drift into an unfounded "done" ambiguously, but it cannot quote a command, an exit status, and output lines it never produced without lying outright — a much rarer and much more detectable act, because a receipt is re-runnable by the user. (Earlier versions of Trial required a *hash* of the output instead. That was theater: test output contains timestamps, so the hash is not reproducible, and a self-reported hash is no harder to invent than a self-reported pass. Quoted output is auditable; a hash is not. It was removed in 0.4.0.)

## Scrutiny scales with risk

| Risk | What the agent does |
|---|---|
| **trivial** (a comment, a rename) | make the change, run the proving check, report with the receipt — no ceremony |
| **default** | acceptance criteria → work → covering test → receipts |
| **high-stakes** | all of the above, then a fresh-eyes judgment before shipping |

**Never rubber-stamp** — always the full adversarial pass: touches auth / payments / permissions / user data, DB migrations, deletes data, **any edit to a test that makes it pass**, second failure on the same task, or evidence that can't be re-run.

## The judges

For high-stakes work, the claim gets judged by fresh eyes before it ships:

- **Platforms with subagents** (Claude Code, and anything with a Task/Agent tool): spawn a fresh agent, give it *only the claim and the receipts*, instructed to reject unless the evidence covers the claim. Disagreement means not done. Fresh context is the point — the judge hasn't watched the work and can't rubber-stamp out of momentum.
- **Platforms without subagents** (Cursor, Windsurf, Cline, aider, …): the agent runs the adversarial pass itself as a separate, final step — re-reading its own claim as a reviewer paid to find the uncovered case, and naming the exact test or line that covers each criterion. Anything it can't name is downgraded to `NOT_PROVEN` in the report.

Honesty note: judges of the same model share the model's blind spots. A fresh context removes momentum and sunk-cost bias — the two failure modes behind most rubber-stamping — but it is not a different reviewer. If you have a second model available, high-stakes judging is a good place to spend it.

## Verdicts

- `ACCEPTED` — every claim is bound to a passing receipt that covers it, and every acceptance criterion is mapped.
- `NOT_PROVEN` — a claim cites evidence, but the receipt is missing or doesn't cover the claim.
- `NEEDS_FIX` — the evidence runs and exposes a defect.
- `ESCALATE` — high-stakes work awaiting the fresh-eyes judgment.

A verdict with no evidence attached is invalid — treat it as "rejected, re-run". That single rule prevents an agent from *performing* approval instead of doing it.

## Triage first — speed is a feature

The default is the fast path: change, proving check, receipt, out. Only genuinely high-stakes work gets the judge pass. A simple task that grows a courtroom is a bug in the process, not rigor. Measured cost of the fast path on a trivial task: about **+7% tokens** and one extra run of the test suite ([numbers](benchmarks/results/2026-07-02-false-done-and-cost.md)).

## What Trial does not do

- It does not make a weak model strong. On our trap task, every agent *found* the bug; what changed was whether the fix came with proof and honest reporting.
- It does not guarantee honesty against a model that lies outright — see "What a receipt is not" above.
- It does not replace CI, code review, or your own judgment. It replaces "trust me, it's done" with something you can re-run.

## Report template

```
DONE — <one-line claim>

Acceptance criteria → receipts:
1. <criterion, stated at the user-facing boundary>
   $ <command>          (exit 0)
   <decisive output lines>
2. ...

Not proven / out of scope: <anything you could not bind to a receipt>
```
