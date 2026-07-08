# Decision OS Demo — PR Readiness (clean review branch)

Companion to [DECISION_OS_DEMO_PROOF_PACKAGE.md](./DECISION_OS_DEMO_PROOF_PACKAGE.md). Records the
clean-branch preparation so the Decision OS demo workstream can be reviewed **without** the
unrelated concurrent churn on `g15-event-foundation`.

## Clean branch

- **Branch:** `decision-os-demo-review` (worktree: `C:/tmp/af-decision-os-review`)
- **Base:** `58da8a44a` (Replay Framework Phase 22) — the commit just before the workstream; it
  carries the prior Replay/intelligence infra the workstream depends on.
- **Contents:** exactly the **15 workstream commits**, cherry-picked in order onto the base. The
  interleaved **foreign commit `3c1600131` ("Wire the NFL redraft Playoffs UI…") was EXCLUDED**
  (it sat between Commissioner P3 and P4 on g15; zero file overlap with the workstream, so the
  cherry-pick was conflict-free).

Cherry-picked order (g15 SHA → new SHA):
```
4752e6b35→077bb2eea  Manager P1 (hub shell)
f7e243e56→c53444f92  Manager P2 (Team Health)
7e1fa88ad→3b083200c  Manager P3 (Weekly Outlook)
dbe0cf85c→da6e5973b  Manager P4 (Transaction Readiness)
66e44e654→67f32ab09  Manager P5 (polish + live-like)
7ea0b6d21→442cc8898  Manager P6 (non-prod runbook)
c09e6f457→ffeffb0b0  Commissioner P1 (proof audit)
3b0898056→b4355e8ab  Commissioner P2 (demo readiness + seed runbook)
fbc233011→52e82a124  Commissioner P3 (Trade Review audit)
60d47c249→8c1e8385b  Commissioner P4 (Trade Review contract)
1fafc4b0c→841c6a753  Commissioner P5 (Rule/Settings audit)
f2af183f5→5a3234b16  Commissioner P6 (Rule/Settings contract)
1beaa47d6→a558a2fe9  Demo Layer P1 (launchers + flow)
ce3b2e9ba→75a679e26  Demo Layer P2 (storyboard)
c02766f90→7c60a09aa  Demo Layer P3 (proof package)
```

## Verification (on the clean branch, in the worktree)

- **Tests:** 15 files / **156 tests PASS** — the whole workstream surface (Manager aggregators +
  routes + hub, Commissioner aggregators + routes + hub + nav-entry + proof-surface, non-prod
  guard, demo-flow entry points).
- **Typecheck:** **176 errors — ALL pre-existing on the base `58da8a44a`; ZERO in workstream
  files.** (The workstream adds no type errors. The 176 are inherited from the mid-development
  base — playoffs config, waiver AI, world-cup, sleeper-import, scoring-runtime, etc.)
- **Working tree:** clean (no unrelated churn; every changed file vs base belongs to the workstream).
- **Boundaries preserved:** no recommendation endpoint consumed, no live DB, no prod defaults, no
  Replay/Manager/Commissioner-contract changes outside their own build phase.

## Honest mergeability caveat

`decision-os-demo-review` cleanly **isolates the workstream**, but it is **not independently
main-mergeable**: its base (Replay P22) is an unmerged development commit with 176 pre-existing
type errors and depends on prior g15/Replay/intelligence infra that is not on `main`. Review this
as a **stacked unit on top of that foundation** — it should land after (or together with) the
g15/Replay lineage it builds on, not as a standalone PR against `main`.

## Ready-to-open PR

The PR body draft lives in the [proof package](./DECISION_OS_DEMO_PROOF_PACKAGE.md#recommended-pr-description)
(Summary / Manager / Commissioner / Demo Layer / Safety / Validation / Known Limitations /
Follow-Up), with the honest status: **"Ready to demo with seeded/live-like data. Approved non-prod
live Sleeper validation remains pending."**

When approved to open it (outward-facing — not done automatically):
```bash
# push the clean branch, then open the PR against its base foundation branch (NOT main directly)
git push -u origin decision-os-demo-review
gh pr create --base <g15-or-replay-foundation-branch> --head decision-os-demo-review \
  --title "Decision OS Demo Layer — Manager + Commissioner Intelligence (observational, default-off)" \
  --body-file docs/DECISION_OS_DEMO_PROOF_PACKAGE.md
```

**Not done yet:** the branch has not been pushed and no PR was opened (both are outward-facing and
await an explicit go-ahead + a confirmed base branch).
