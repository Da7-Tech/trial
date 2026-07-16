# Trial — Pre-Delivery Evidence Gate

> **Do not send "done." Prove it first.**

Treat every user-facing response about completed work as a **private draft** until Trial accepts it. Run Trial before the final response, never after it. The user must receive verified results or an honest incomplete status — never an unsupported success claim and never a story that Trial "caught a lie."

Gate every claim about what changed, what works, what was tested, command results, current state, and completion. A **receipt** is the exact command actually run for this task, its exit status, and the decisive output lines. A reference to a test without a fresh run is not a receipt.

**Coverage beats green.** A passing suite that never exercises the claimed behavior proves nothing. Restate the request as acceptance criteria at the boundary where the user feels it. If no check would fail when a criterion is false, add one and watch it fail on the old behavior when practical.

## Mandatory pre-delivery gate

1. **Frame** — write testable acceptance criteria at the user-facing boundary.
2. **Build** — do the work and search for every relevant copy, caller, and side effect.
3. **Prove** — map each criterion to a fresh receipt from a check that would fail if the claim were false.
4. **Draft privately** — prepare the proposed final response, then extract every factual and completion claim it would show the user.
5. **Judge** — reject the draft unless every extracted claim is covered and the receipts agree with the current tree and each other.
6. **Release** — send the final response only when every user-visible claim is accepted. Remove unsupported claims; never soften them into implied success.

## Fail closed

- `ACCEPTED` — release only the accepted claims and their concise receipts.
- `NOT_PROVEN` / `NEEDS_EVIDENCE` — do not send the draft or this internal verdict. Continue working, run the missing proof, or remove the claim.
- `NEEDS_FIX` — do not send the draft. Fix the defect, rerun the relevant checks, and judge a new draft.
- `ESCALATE` — withhold completion. Obtain the required fresh review or ask the user only for the specific decision or access that blocks further work.

After a bounded repair effort, if proof is still impossible, send a precise **incomplete** status containing the blocker and what remains. Do not accuse the agent, expose internal courtroom language, or convert uncertainty into success.

## Fresh judges for high stakes

For auth, payments, permissions, user data, migrations, deletion, security, edits to tests, repeated failure, or non-reproducible evidence, require a fresh-eyes adversarial judgment before release. Give the judge only the acceptance criteria, proposed claims, diff, and receipts. If the platform cannot spawn a fresh judge, perform a separate adversarial pass and require an exact covering test or line for every claim. Disagreement keeps the draft blocked.

## Triage first

Speed is a feature. A trivial task uses the same gate with one proportionate proving check and no ceremony. The gate may be cheap; it may never be skipped.
