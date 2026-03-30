# PROMPT 198 — Post-Draft Automation and AI Recap Deliverable

## Overview

Post-draft processing is now split into:

- **Deterministic automation layer** (always-on, no AI required)
- **Optional AI recap layer** (only when requested and provider/policy allow)

Supported sports: NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer.

---

## 1) Deterministic Post-Draft Tasks

| Task | Implementation | Status |
|---|---|---|
| Finalize rosters | `ensurePostDraftFinalized()` + `finalizeRosterAssignments()` | Implemented |
| Draft summary | `buildPostDraftSummary()` | Implemented |
| Pick log | `PostDraftSummary.pickLog` | Implemented |
| Team-by-team results | `PostDraftSummary.teamResults` | Implemented |
| Value/reach calculations | `PostDraftSummary.valueReach` + manager ranking value scores | Implemented |
| Budget summary (auction) | `PostDraftSummary.budgetSummary` | Implemented |
| Keeper outcome summary | `PostDraftSummary.keeperOutcome` | Implemented |
| Devy/C2C slot summary | `PostDraftSummary.devyRounds`, `c2cCollegeRounds` | Implemented |

---

## 2) Automation Services and Routes

| File | Purpose |
|---|---|
| `lib/post-draft/PostDraftAutomationService.ts` | Deterministic post-draft summary + finalize guard. |
| `lib/post-draft/PostDraftRecapService.ts` | Deterministic recap sections: league narrative, strategy recap, value/reach explanation, team grade explanations, Chimmy debrief. |
| `lib/post-draft/types.ts` | Summary + recap section contracts (`PostDraftRecapSections`, `TeamGradeExplanationEntry`). |
| `lib/post-draft/index.ts` | Re-exports summary and recap services/types. |
| `app/api/leagues/[leagueId]/draft/post-draft-summary/route.ts` | Ensures finalize, then returns deterministic post-draft summary. |
| `app/api/leagues/[leagueId]/draft/replay/route.ts` | Ensures finalize, returns deterministic pick-log replay payload. |
| `app/api/leagues/[leagueId]/draft/recap/route.ts` | Returns deterministic recap sections and optional AI rewrite layer. |

---

## 3) Recap UI

`components/app/draft-room/PostDraftView.tsx` now renders structured recap cards in the recap tab:

- `post-draft-recap-card-narrative`
- `post-draft-recap-card-strategy`
- `post-draft-recap-card-value`
- `post-draft-recap-card-chimmy`
- `post-draft-recap-card-team-grades`

AI remains optional:

- `post-draft-ai-recap-generate` requests AI rewrite
- deterministic cards still render even without AI
- AI narrative output appears in `post-draft-ai-recap-text`

Share/export actions remain explicit and wired:

- `post-draft-share-native`
- `post-draft-share-copy-link`
- `post-draft-share-copy-summary`
- `post-draft-export-csv`

---

## 4) Automation vs AI Notes

- **Automation first:** all completion, summaries, pick logs, team results, value/reach, auction budget, keeper/devy/C2C outputs are deterministic.
- **AI optional:** recap route can rewrite deterministic sections when `includeAiExplanation=true` and policy/provider permit.
- **Fallback-safe:** if AI is denied/timeout/error, deterministic recap sections are still returned and rendered.
- **No stale completion state:** summary/replay routes now re-run finalize guard before returning data.

---

## 5) Click Audit QA Checklist

- [x] **Summary page opens correctly**: Post-draft view is default when draft status is completed.
- [x] **Recap cards render correctly**: Recap tab renders deterministic recap cards and team-grade explanations.
- [x] **AI recap opens correctly when enabled**: Generate button triggers recap API and renders AI narrative output.
- [x] **No dead share/export actions**: Share/export actions exist and are wired; no dead placeholder controls.
- [x] **No stale draft completion states**: Post-draft assertions verify completed view state (no active timer/on-clock shell state).

---

## 6) E2E Coverage Updated

- `e2e/draft-room-click-audit.spec.ts`
  - extended post-draft test assertions for recap cards
  - asserts no stale timer state in post-draft mode
  - keeps AI recap and share/export click audit coverage
