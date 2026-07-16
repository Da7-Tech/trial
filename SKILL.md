---
name: trial
description: "A pre-delivery evidence gate for coding agents. Hold the final response as a private draft, judge every user-visible claim against fresh covering receipts, and release only verified results. Use when unsupported completion claims, shallow green tests, stale evidence, or high-risk changes must not reach the user."
license: MIT
metadata:
  version: 0.5.3
---

# Trial — Pre-Delivery Evidence Gate

> **Do not send "done." Prove it first.**

Trial changes the order of delivery:

> **Draft privately → prove → judge → release.**

The user does not need a notification that an agent almost made an unsupported
claim. The useful outcome is that the claim never leaves the draft. Trial sends
the agent back to proof or repair before the final response is visible.

Trial is a behavioral skill. The canonical rule agents read is
[`agents/codex/AGENTS.md`](agents/codex/AGENTS.md); every supported agent copy is
byte-synchronized with it by [`tests/sync.test.js`](tests/sync.test.js).

## What the gate covers

Before final delivery, extract every statement about:

- what changed;
- what now works;
- what was tested or built;
- command results and current repository state;
- whether the requested work is complete.

Each statement must be either accepted with covering evidence, removed, or
rewritten as an explicit incomplete status. Unsupported success must never be
preserved through softer wording such as "should work", "appears fixed", or
"everything looks good".

## Receipts and coverage

A receipt contains the exact command run during the current task, its exit
status, and decisive output lines. A named test with no fresh execution is not a
receipt.

**Coverage beats green.** A receipt counts only when the command would fail if
the user-facing acceptance criterion were false. A broad green suite that does
not exercise the claimed behavior proves nothing. When coverage is missing, add
the smallest meaningful check and observe the old behavior fail when practical.

Receipts must be mutually consistent and describe the current tree. Stale output,
output from another revision, or a passing command contradicted by another
relevant failure blocks release.

## Mandatory pre-delivery protocol

1. **Frame** — restate the request as testable acceptance criteria at the
   boundary where the user experiences the result.
2. **Build** — implement the work and inspect relevant copies, callers, and side
   effects.
3. **Prove** — map every criterion to a fresh receipt from a check that would
   fail if the criterion were false.
4. **Draft privately** — prepare the proposed final response without sending it.
5. **Extract claims** — list every factual and completion claim in that draft.
6. **Judge** — reject the draft unless every claim is covered and the evidence
   agrees with the current state.
7. **Release** — send the final response only when every user-visible claim is
   accepted, and include concise receipts for those claims.

The gate runs before the final response on every task that changes code or files.
Risk controls the cost of judgment, not whether judgment happens.

## Fail closed

- `ACCEPTED`: release only accepted claims.
- `NOT_PROVEN` or `NEEDS_EVIDENCE`: do not send the draft or this internal
  verdict; gather proof, continue working, or remove the claim.
- `NEEDS_FIX`: do not send the draft; repair, rerun, and judge a new draft.
- `ESCALATE`: withhold completion until the required fresh review or user
  decision exists.

Do not tell the user that Trial caught a lie. Intent is not observable, and an
accusation does not improve the result. If bounded repair cannot establish
proof, send only a precise incomplete status: the concrete blocker, work that
is known to be complete, and work that remains. Never convert uncertainty into
success.

## Risk-scaled judgment

Trivial work takes the fast path: one proportionate proving check, a private
claim scan, then delivery with no ceremony.

Always require a fresh-eyes adversarial judgment for authentication, payments,
permissions, user data, migrations, deletion, security, edits to tests, repeated
failure, or evidence that cannot be reproduced. Give the judge only the
acceptance criteria, proposed claims, diff, and receipts. Disagreement keeps the
draft blocked.

If the platform has no independent judge, perform a separate adversarial pass
and require the exact test or line that covers each claim. This removes momentum
bias but is not equivalent to a different model.

## Public response shapes

When accepted:

```text
Completed: <accepted result>

Evidence:
- <criterion>: <command>, exit <status>, <decisive output>
```

When genuinely blocked:

```text
Incomplete: <specific remaining outcome>

Blocked by: <missing access, decision, dependency, or failing behavior>
Verified so far: <accepted claims only>
```

Internal verdict labels and rejected drafts are not part of the public response.

## Limits

- Trial blocks unsupported claims when the host loads and follows the skill. A
  portable rules file cannot physically restrain a hostile model that ignores
  higher-priority instructions or fabricates tool output.
- Trial does not make a weak model more capable. It improves delivery by forcing
  evidence, exposing gaps before release, and preferring an honest incomplete
  result over false completion.
- Trial complements real tool execution, continuous integration, code review,
  and host-level hooks. Host enforcement is stronger than prompt-only
  enforcement.

## Evidence status

The published controlled benchmark measured the version 0.4 receipt-and-coverage
rule: covering tests were left in 6 of 6 Trial runs versus 4 of 6 baseline runs,
and the sampled Trial reports contained no false verification claim. Historical
run trees and complete reports were not retained, so those aggregates cannot be
independently re-scored from this checkout.

Version 0.5 preserves that measured rule and adds the stronger private-draft,
fail-closed delivery contract. That new contract is protected by deterministic
policy and synchronization tests, but has not yet been re-measured on live agent
sessions.
