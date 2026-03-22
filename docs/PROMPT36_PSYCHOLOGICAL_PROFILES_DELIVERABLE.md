# Prompt 36 — Psychological Profiles Engine + Full UI Click Audit (Deliverable)

## 1. Psychological Profiles Architecture

- **Core pipeline:** `lib/psychological-profiles/PsychologicalProfileEngine.ts` orchestrates aggregation, label resolution, score resolution, profile upsert, and evidence persistence.
- **Modules implemented and integrated:**
  - `BehaviorSignalAggregator`
  - `ProfileLabelResolver`
  - `ProfileEvidenceBuilder`
  - `ManagerBehaviorQueryService`
  - `SportBehaviorResolver`
- **Sport support:** Resolver and types now align with `lib/sport-scope.ts` as source of truth (NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER).
- **Persistence model:** `ManagerPsychProfile` + `ProfileEvidenceRecord` continue as the canonical store, with evidence refreshed each run and season-stamped for season-aware queries.

---

## 2. Behavior Modeling Logic

- **Signals now aggregated from multiple sources:**
  - trade history and transaction facts (`LeagueTradeHistory`, `LeagueTrade`, `TransactionFact`)
  - waiver behavior (`WaiverClaim`)
  - draft behavior (`DraftFact`, drafted player position mix)
  - lineup volatility and benching proxy (`RosterSnapshot`)
  - contention context (`SeasonStandingFact`)
- **Derived behavioral dimensions:**
  - `tradeFrequencyNorm`, `tradeTimingLateRate`
  - `waiverFocusNorm`
  - `lineupChangeRate`, `benchingPatternScore`
  - `rookieAcquisitionRate`, `vetAcquisitionRate`
  - `draftEarlyRoundRate`, `positionPriorityConcentration`
  - `rebuildScore`, `contentionScore`, `aggressionNorm`, `riskNorm`
- **Labels remain configurable and evidence-based:**
  - aggressive, conservative, trade-heavy, waiver-focused, quiet strategist, chaos agent, value-first, rookie-heavy, win-now, patient rebuilder
- **Sport-aware calibration:** `SportBehaviorResolver.getBehaviorCalibration()` adjusts lineup-volatility weight, late-trade threshold, and rookie-preference weighting by sport.

---

## 3. Schema Additions

Existing schema structures are used directly:

- `ManagerPsychProfile`
  - `profileId` (`id`), `managerId`, `sport`, `profileLabels`
  - `aggressionScore`, `activityScore`, `tradeFrequencyScore`, `waiverFocusScore`, `riskToleranceScore`
  - `updatedAt`
- `ProfileEvidenceRecord`
  - `evidenceId` (`id`), `managerId`, `sport`, `evidenceType`, `value`, `sourceReference`, `createdAt`

No new tables were required for this pass; implementation focuses on richer signal/evidence generation and UI/API wiring.

---

## 4. Profile and Evidence Integration Updates

- **API upgrades:**
  - `GET /api/leagues/[leagueId]/psychological-profiles`
    - supports `sport`, `season`, `managerId`, and pair comparison via `managerAId` + `managerBId`
  - `POST /api/leagues/[leagueId]/psychological-profiles/run`
    - supports sport/season-aware single-manager profile runs
  - `POST /api/leagues/[leagueId]/psychological-profiles/run-all`
    - supports sport/season and optional manager subset runs
  - `GET /api/leagues/[leagueId]/psychological-profiles/[profileId]?includeEvidence=1`
    - returns profile + evidence
  - `GET /api/leagues/[leagueId]/psychological-profiles/[profileId]/evidence`
    - season-filtered evidence endpoint
  - `POST /api/leagues/[leagueId]/psychological-profiles/explain`
    - now model-backed explain with deterministic fallback narrative
- **UI surface integration:**
  - `BehaviorProfilesPanel` upgraded into a full profile management console (filters, run, refresh, explain, compare selectors, profile cards, drill-down links)
  - new profile dashboard route: `app/app/league/[leagueId]/psychological-profiles/page.tsx`
  - new profile detail route: `app/app/league/[leagueId]/psychological-profiles/[profileId]/page.tsx`
  - new comparison route: `app/app/league/[leagueId]/psychological-profiles/compare/page.tsx`
  - `ManagerStyleBadge` now links to profile detail
  - `ManagerPsychology` now includes profile refresh + profile detail link
  - `PartnerMatchView` adds style-context link
  - `DraftTab` adds manager tendency widget + compare entry point

---

## 5. Full UI Click Audit Findings

Detailed matrix: `docs/PROMPT36_PSYCHOLOGICAL_PROFILE_CLICK_AUDIT_MATRIX.md`.

Key outcomes:

- Profile dashboard entry, run, refresh, sport/season filters, and profile-card actions are wired.
- Comparison selectors and compare route load correctly and update comparison state.
- Profile detail page supports explain, evidence refresh, season filter, and back navigation.
- Manager psychology cards include live profile refresh, drill-down links, and explain actions.
- Trade analyzer and draft room surfaces now expose manager style context links/widgets.
- Loading and error states verified across panel/detail/compare flows.

---

## 6. QA Findings

- **Typecheck:** `npm run -s typecheck` passed.
- **Unit tests added and passing:**
  - `__tests__/psychological-profile-labels.test.ts`
  - `__tests__/sport-behavior-resolver.test.ts`
- **E2E click audit added and passing:**
  - `e2e/psychological-profiles-click-audit.spec.ts`
- **Lint diagnostics:** no new lints in changed files.

---

## 7. Issues Fixed

- Sport lists and normalization in psych modules were hardcoded; now aligned to `sport-scope`.
- Behavior aggregation previously under-modeled lineup/draft/timing signals; now expanded and season-aware.
- Evidence builder previously emitted placeholder draft tendency; now emits real draft/position/timing/lineup evidence.
- Profiles API lacked comparison query flow; added pair-comparison support.
- No dedicated profile detail/compare routes; both implemented with refresh/back/explain/filter interactions.
- Draft and trade surfaces had weak manager style context links; added explicit style context entry points.

---

## 8. Final QA Checklist

- [x] Typecheck passes.
- [x] Psychological profile unit tests pass.
- [x] Psychological profile click-audit E2E spec passes.
- [x] Profile dashboard + detail + compare routes wired.
- [x] Trade analyzer and draft room manager-style context integrated.
- [ ] Manual live-data smoke for all sports:
  - NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER.

---

## 9. Explanation of the Psychological Profiles Engine

The Psychological Profiles Engine is now a production behavioral intelligence layer that converts manager actions into explainable style profiles. It combines draft tendencies, trade behavior, waiver activity, lineup volatility, contention posture, and risk proxies into normalized scores and labels, then persists both profile summaries and explicit evidence records.

The UI stack now supports the full workflow: profile generation, profile browsing, manager-to-manager comparison, evidence drill-down, and AI explanation. Integrations are in place across settings/profile dashboards, manager cards, trade context, and draft context, with sport-aware logic and season-aware filtering where applicable.
