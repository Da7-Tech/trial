# Trial — Evidence Before Done

**Don't say done. Prove it.**

A behavioral skill that stops an agent from claiming **"done"** until the work survives **executable evidence**. It works the moment you drop the rule file into your agent — with whatever model you already run. The judges are fresh agents of the same kind, spawned automatically when the work is high-stakes. No separate model, no configuration.

```
Agent:   Done. Fixed login redirect after session expiry.
Trial:   ⛔ NOT_PROVEN.
         The claim "expired sessions redirect" has no bound evidence —
         the cited test covers the no-session case, not the expired-session case.
         Required: a test that proves shouldRedirect({expired:true}) === true.
Agent:   Added expired-session test + fixed the guard branch.
Trial:   ✅ ACCEPTED. Evidence: expired-session test covers the clause; npm test passed.
```

## Install — copy one file for your agent

| Agent | Copy this → to here |
|---|---|
| **Claude Code** | `agents/claude/SKILL.md` → your project's skill/rules |
| **Cursor** | `agents/cursor/.cursor/rules/trial.mdc` → `.cursor/rules/` |
| **Codex** | `agents/codex/AGENTS.md` → project root `AGENTS.md` (or merge) |
| **Windsurf** | `agents/windsurf/.windsurf/rules/trial.md` → `.windsurf/rules/` |
| **Cline** | `agents/cline/.clinerules/trial.md` → `.clinerules/` |
| **Any other agent** | paste the rule from [`SKILL.md`](SKILL.md) into whatever rules file your agent reads |

## The one rule

> **No "done" without evidence. No evidence without a hash. No escalation unless it's cheaper than the failure it prevents.**

Before claiming done, the agent binds each claim to a **command it ran + a hash of that command's output**. A claim that cites "tests passed" with no bound receipt is `NOT_PROVEN` — rejected before any judging.

## How hard to scrutinize (scales to risk)

- **trivial work** — run the proving tests, done.
- **high-stakes work** — spawn fresh agents (same kind, isolated context) to judge the claim independently. Each must cite the exact line, test, or missing receipt before it accepts.

**Never rubber-stamp**: auth / payments / permissions / user data, DB migration, deletes data, **modifies tests to make them pass**, failed the same task twice, or no reproducible evidence. For these, always bring in fresh independent judges.

A verdict with no "evidence checked" is invalid. And finish in a time that fits the task — a simple fix does not need a tribunal.

## License

MIT — see [LICENSE](LICENSE).
