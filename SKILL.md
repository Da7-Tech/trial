---
name: trial
description: "Gated judging that stops false-done: an agent may not claim a task is done until executable evidence survives an independent verdict. Use for work where a green test is not enough proof."
version: 0.3.0
license: MIT
---

# Trial — Evidence Before Done

> **Don't say done. Prove it.**

Trial is one rule injected into how an agent finishes work:

> **Consider every claim of completion worthless until executable evidence proves it. Spend on that proof in proportion to risk — never more, never less.**

It is a **behavioral skill**: it runs with whatever model the user already chose, and the judges are fresh agents of the same kind, spawned automatically when the work is high-stakes. No separate model, no configuration, no setup.

## The one rule

Before the agent writes the word **"done"** (or "complete", "finished", "fixed", "shipped") about a task, it must bind each claim to **executable evidence** — a command that was actually run, plus a hash of that command's output. A claim with no bound evidence is automatically `NOT_PROVEN`, *before any judge ever reads it*.

> **No "done" without evidence. No evidence without a hash. No escalation unless it's cheaper than the failure it prevents.**

## How hard to scrutinize (scales to risk)

| Risk | What the agent does |
|---|---|
| **trivial** (a util, a small fix) | run the proving tests, done |
| **default** | collect the claim + run the proving tests |
| **high-stakes** | spawn fresh agents (of the same kind) to judge the claim independently, each from a different angle, before accepting |

**Never rubber-stamp these** — always scrutinize hardest, and bring in fresh judges: touches auth / payments / permissions / user data, DB migration, deletes data, **modifies tests to make them pass**, failed the same task twice, or has no reproducible evidence.

## The judges are automatic

Trial never asks the user to pick a judge model. The judges are **fresh agents of the same kind the user already runs**, spawned in isolated contexts:

- **low-stakes work** — no judges; verify by running it (the cheapest correct path).
- **high-stakes work** — dispatch fresh agents to judge the claim, each from a different lens (requirements-match / real execution / adversarial). They must cite the exact line, test, or missing receipt before they accept. Disagreement between judges is the escalation signal — agreement is not.

This keeps Trial portable: it works the moment you drop the rule into any agent, because the "judge" is just another fresh instance of that same agent.

## Verdicts

- `ACCEPTED` — every claim is bound to passing evidence and covers every acceptance criterion.
- `NOT_PROVEN` — a claim cites evidence but the receipt is missing or doesn't cover the claim.
- `NEEDS_FIX` — the evidence runs but exposes a defect.
- `ESCALATE` — high-stakes work that needs fresh independent judges before it can ship.

**A verdict with no "evidence checked" is invalid** — treat it as "rejected, re-run". That single rule prevents an agent from *performing* approval instead of *doing* it.

## Triage FIRST (speed is a feature)

Default to the **fast path**: run the gates inline in minutes, verify by executing the work, no fan-out. Only genuinely large or high-stakes work spawns fresh judges. A simple task that takes half an hour, or stalls at "gate 3/8", is a **bug, not rigor**.

## Honesty

- "Verified" means nothing without a written artifact showing the method, the evidence, and the result.
- Finish in a time that fits the task.
- On the fast path, the trade is honest: you verify by running the work directly instead of spawning fresh judges — correct for low-stakes work.
