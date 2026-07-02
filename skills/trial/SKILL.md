---
name: trial
description: "Trial — evidence before done. An agent may not claim a task is done until every claim is bound to a receipt (command + exit status + decisive output) that covers it, with scrutiny scaled to risk."
---

# Trial — Evidence Before Done

> **Don't say done. Prove it.**

Before you write **"done"** (or "complete", "finished", "fixed", "shipped") about a task, bind every claim to a **receipt**: the exact command you ran, its exit status, and the decisive lines of its output, quoted in your report. A claim with no receipt is `NOT_PROVEN` — you reject it yourself, before anyone else reads it.

**Coverage beats green.** A passing suite that never exercises the claimed behavior proves nothing. Restate the bug report or request as an acceptance criterion at the boundary where the user feels it ("an expired session gets redirected", not "the helper returns true"). If no test exercises that criterion, write one, watch it fail on the old behavior, then fix until it passes.

## What to do
1. **Frame** — restate the goal as testable acceptance criteria at the user-facing boundary.
2. **Build** — do the work. Fix root causes: grep for every copy or caller of the logic you touch.
3. **Prove** — for each criterion, run the command that would fail if your claim were false. Quote command + exit status + decisive output lines in your report.
4. **Scale scrutiny to risk** — trivial change: run the proving test, ship. High-stakes change: get a fresh-eyes judgment before shipping (below).
5. **Deliver** — map each criterion to its receipt. Never ship a known blocker; a red test you can explain beats a green claim you can't.

## Fresh judges (high-stakes only)
If your platform can spawn subagents, give a fresh one only the claim and the receipts, instructed to reject unless the evidence covers the claim — disagreement means not done. If it can't spawn agents, run the adversarial pass yourself as a separate final step: re-read your claim as a reviewer paid to find the uncovered case, and name the exact test or line that covers each criterion — anything you can't name gets downgraded to `NOT_PROVEN` in your report.

## Never rubber-stamp
Auth / payments / permissions / user data, DB migrations, anything that deletes data, **any edit to a test that makes it pass**, second failure on the same task, or evidence that can't be re-run. These always get the adversarial pass.

## Triage first
Speed is a feature. A trivial task takes the fast path: make the change, run the proving check, report with the receipt — no ceremony, no tribunal. If a simple fix is growing a courtroom, that's a bug in your process, not rigor.
