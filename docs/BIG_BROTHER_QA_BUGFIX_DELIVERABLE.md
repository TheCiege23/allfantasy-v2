# Big Brother League — Full QA + Bug Fix Pass Deliverable (All Sports, Sport-Calendar Dependent)

## 1. Implementation / QA Summary

This pass adds **sport-calendar awareness** and **non-NFL disclaimers** to the Big Brother League system without replacing existing working logic. Timing remains day-of-week + time UTC in config; enforcement remains commissioner- or cron-driven. The new layer provides:

- **BigBrotherSportCalendar** — Uses the sport’s schedule template (`ScheduleTemplateResolver`) for `regularSeasonWeeks` and constants for `evictionEndWeek`. Exposes `scoringWindowDisclaimer` for non-NFL and `timelineNote` for commissioners.
- **Summary API** — Returns `sportCalendar` (regularSeasonWeeks, evictionEndWeek, scoringWindowDisclaimer, timelineNote) so the UI can show sport-aware context and disclaimers.
- **Big Brother Home** — Renders a “Scoring window note” banner when `summary.sportCalendar.scoringWindowDisclaimer` is present (non-NFL).
- **Settings panel** — Always shows a note that weekly deadlines should align to the league’s scoring week; shows an additional non-NFL disclaimer when sport ≠ NFL.
- **Chimmy context** — Includes sport in context and adds a non-NFL timeline disclaimer so Chimmy can explain sport-aware weekly timeline and scoring-window caveats.

**Preserved:** All existing HOH, nomination, veto, voting, eviction, jury, waiver, and automation logic; phase state machine; eligibility; config storage; league creation; commissioner controls.

---

## 2. Full File List

| Label     | Path |
|----------|------|
| [NEW]    | `lib/big-brother/BigBrotherSportCalendar.ts` |
| [UPDATED]| `app/api/leagues/[leagueId]/big-brother/summary/route.ts` |
| [UPDATED]| `components/big-brother/types.ts` |
| [UPDATED]| `components/big-brother/BigBrotherHome.tsx` |
| [UPDATED]| `components/big-brother/BigBrotherSettingsPanel.tsx` |
| [UPDATED]| `lib/big-brother/ai/bigBrotherContextForChimmy.ts` |
| [UPDATED]| `lib/big-brother/index.ts` |
| [NEW]    | `docs/BIG_BROTHER_QA_BUGFIX_DELIVERABLE.md` |

---

## 3. SQL / Schema Changes

**None.** No Prisma or DB changes. Big Brother config and cycles already store sport via League and day-of-week + time UTC; the new module is read-only for calendar context.

---

## 4. QA Checklist (Pass/Fail)

| Area | Status | What was validated |
|------|--------|--------------------|
| **League creation** | Pass | Big Brother creation path unchanged; sport from request; `upsertBigBrotherConfig(league.id, {})` after create. |
| **Sport-calendar integration** | Pass | `getBigBrotherSportCalendarContext(sport)` uses `ScheduleTemplateResolver` and `DEFAULT_EVICTION_END_WEEK_BY_SPORT`; all supported sports get correct regularSeasonWeeks and evictionEndWeek. |
| **Non-NFL disclaimer** | Pass | Summary returns `scoringWindowDisclaimer` for non-NFL; Home shows banner when present; Settings shows non-NFL disclaimer and timeline note. |
| **Timeline note** | Pass | Settings and Chimmy context state that weekly deadlines should align to scoring week. |
| **Chimmy / AI** | Pass | Context includes sport and non-NFL timeline disclaimer; AI does not decide outcomes (unchanged). |
| **HOH / nomination / veto / voting / eviction** | Not modified | Existing engines and state machine preserved. |
| **Commissioner controls** | Not modified | Config GET/PATCH, automation run, admin actions unchanged. |
| **Regression** | Pass | No changes to Survivor, Chimmy private chat, waiver, or other specialty leagues. |

---

## 5. Bug Fixes Made During QA

- **Sport-calendar not used** — Added `BigBrotherSportCalendar.ts` and summary `sportCalendar` so Big Brother is explicitly tied to the sport’s schedule template and eviction end week.
- **No non-NFL disclaimer** — Added `scoringWindowDisclaimer` and UI display so non-NFL leagues see that some games may not count depending on scoring-period cutoff.
- **No commissioner guidance on timing** — Added timeline note in Settings and Chimmy context so commissioners know to align deadlines to the scoring week.

---

## 6. Migration Notes

- No migrations. Existing Big Brother leagues get the new summary fields on next load; no backfill.
- If a league uses a sport not in `SUPPORTED_SPORTS` or without a schedule template, `getScheduleTemplate` may use a fallback; `evictionEndWeek` falls back to `Math.min(regularSeasonWeeks + 2, 26)` when the sport is missing from `DEFAULT_EVICTION_END_WEEK_BY_SPORT`.

---

## 7. Manual Commissioner Steps

- **Weekly deadlines:** Set HOH, nomination, veto, and voting deadlines (day of week + time UTC) to align with the league’s **scoring week** for the chosen sport (e.g. after the scoring period closes for that week).
- **Non-NFL leagues:** Read the “Scoring window note” on the Big Brother home and the “Non-NFL league” box in Settings; inform houseguests that some games may not count depending on scoring-period cutoff.
- **Automation:** Continue using the Commissioner tab to run automation steps (start week 1, veto draw, lock voting, close eviction, etc.) at the appropriate times, or use a cron that calls the automation API when deadlines pass.

---

## 8. Full File Contents (Key Additions)

### [NEW] lib/big-brother/BigBrotherSportCalendar.ts

See the file in the repo; it exports:

- `getBigBrotherSportCalendarContext(sport)` → `BigBrotherSportCalendarContext`
- `isSportSupportedForBigBrother(sport)` → boolean

`BigBrotherSportCalendarContext` includes: `sport`, `regularSeasonWeeks`, `evictionEndWeek`, `showScoringWindowDisclaimer`, `scoringWindowDisclaimer`, `timelineNote`.

### [UPDATED] Summary route

- Imports `getBigBrotherSportCalendarContext`.
- After computing `remainingCount`, calls `getBigBrotherSportCalendarContext(config.sport)` and adds to the JSON response a `sportCalendar` object with `regularSeasonWeeks`, `evictionEndWeek`, `scoringWindowDisclaimer`, `timelineNote`.

### [UPDATED] components/big-brother/types.ts

- `BigBrotherSummary` now includes optional `sportCalendar?: { regularSeasonWeeks, evictionEndWeek, scoringWindowDisclaimer, timelineNote }`.

### [UPDATED] BigBrotherHome.tsx

- After the header, conditionally renders a “Scoring window note” block when `summary?.sportCalendar?.scoringWindowDisclaimer` is truthy, using `summary.sportCalendar.scoringWindowDisclaimer` as the body text.

### [UPDATED] BigBrotherSettingsPanel.tsx

- Adds `NON_NFL_SCORING_DISCLAIMER` constant.
- Adds `isNfl` from `(config.sport ?? 'NFL').toUpperCase() === 'NFL'`.
- Before “Schedule: HOH challenge”, adds a paragraph with the timeline note (align deadlines to scoring week) and, when `!isNfl`, a bordered box with the non-NFL disclaimer.

### [UPDATED] lib/big-brother/ai/bigBrotherContextForChimmy.ts

- Builds `sportNote` when `ctx.sport && ctx.sport !== 'NFL'` with the non-NFL timeline/scoring-window sentence.
- Injects “Sport: …” into the context string and appends “Weekly deadlines … align to the league's scoring week.” plus `sportNote` and the existing determinism rules.

### [UPDATED] lib/big-brother/index.ts

- Exports `getBigBrotherSportCalendarContext`, `isSportSupportedForBigBrother`, and type `BigBrotherSportCalendarContext` from `./BigBrotherSportCalendar`.

---

## 9. What Remains Out of Scope (No Changes)

- **Automatic deadline enforcement:** Timing is still “run automation when the commissioner (or cron) decides”; no new cron or wall-clock checks were added.
- **“Pick 2 or 3 games per week” mode:** Not implemented; disclaimers cover “every game counts” and scoring-period cutoff only.
- **Playoff / bracket alignment:** Big Brother eviction end week is regular-season based; no change to playoff or bracket logic.
- **Existing engines:** HOH, nomination, veto, vote, eviction, jury, roster release, and phase state machine are unchanged.

This deliverable makes Big Brother **sport-calendar aware** and **disclaimer-compliant** for non-NFL without redesigning the existing flow.
