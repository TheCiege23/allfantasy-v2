# Prompt 36 — Psychological Profiles Engine + Full UI Click Audit (Deliverable)

## 1. Psychological Profiles Architecture

- **Purpose:** Model manager behavior patterns from fantasy actions and expose evidence-based profile labels and scores for display, comparison, and AI explanation.
- **Data flow:**
  - **Inputs:** League ID, manager ID (e.g. rosterId string), sport, optional sleeperUsername and rosterId (Roster uuid for waiver resolution).
  - **Aggregation:** `BehaviorSignalAggregator` pulls trade counts and waiver claims from LeagueTradeHistory/LeagueTrade (Sleeper) and WaiverClaim (by Roster). Computes trade frequency, waiver focus, rookie/vet acquisition rates, picks in/out, rebuild vs contention, aggression and risk norms.
  - **Labels:** `ProfileLabelResolver` maps signals to configurable labels (aggressive, conservative, trade-heavy, waiver-focused, quiet strategist, chaos agent, value-first, rookie-heavy, win-now, patient rebuilder) via thresholds.
  - **Scores:** Same resolver produces 0–100 scores for aggression, activity, trade frequency, waiver focus, risk tolerance.
  - **Evidence:** `ProfileEvidenceBuilder` turns signals into `ProfileEvidenceRecord` rows (evidenceType, value, sourceReference) to back the profile.
  - **Persistence:** `PsychologicalProfileEngine` upserts `ManagerPsychProfile` (unique leagueId + managerId) and replaces evidence records on each run.
- **Query:** `ManagerBehaviorQueryService` lists profiles by league (sport filter), gets one by id or by (leagueId, managerId).
- **Sport:** `SportBehaviorResolver` normalizes and labels sports (NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER) and can apply sport-specific thresholds (e.g. trade frequency bar).
- **Coexistence:** Existing POST `/api/rankings/manager-psychology` (archetypes + AI narrative) is unchanged. The new engine provides persisted, evidence-based labels and scores; ManagerPsychology UI loads engine profile when available and shows labels + “Why this profile?” explain.

---

## 2. Behavior Modeling Logic

- **Signals aggregated:** tradeCount, tradeFrequencyNorm (capped by MAX_TRADES_FOR_NORM), waiverClaimCount, waiverFocusNorm, lineupChangeRate (stub 0), rookieAcquisitionRate, vetAcquisitionRate, picksTradedAway, picksAcquired, rebuildScore, contentionScore, aggressionNorm, riskNorm.
- **Label rules (configurable thresholds):**
  - trade-heavy: tradeCount ≥ tradeHeavyMinTrades (default 6).
  - waiver-focused: waiverClaimCount ≥ waiverFocusedMinClaims (default 12).
  - aggressive: aggressionNorm ≥ aggressiveMinScore (default 55).
  - conservative: tradeCount ≤ conservativeMaxTrade (2) and waiverFocusNorm < 30.
  - quiet strategist: tradeCount ≤ 3 and aggressionNorm < 40.
  - chaos agent: activity (avg of trade + waiver norms) ≥ chaosMinActivity (60) and riskNorm ≥ 60.
  - value-first: rebuildScore < 30 and contentionScore ≥ 30.
  - rookie-heavy: rookieAcquisitionRate ≥ 55.
  - win-now: contentionScore ≥ 50.
  - patient rebuilder: rebuildScore ≥ 50.
- **Scores:** aggressionScore, activityScore (average of trade/waiver norms), tradeFrequencyScore, waiverFocusScore, riskToleranceScore — all 0–100.
- **Evidence types:** trade_frequency, waiver_activity, lineup_changes, rookie_vs_veteran, rebuild_contention, risk_taking, draft_tendency (deferred).

---

## 3. Schema Additions

- **ManagerPsychProfile** (`manager_psych_profiles`): id (cuid), leagueId (VarChar 64), managerId (VarChar 128), sport (VarChar 16), profileLabels (Json array), aggressionScore, activityScore, tradeFrequencyScore, waiverFocusScore, riskToleranceScore (all Float), updatedAt. Unique (leagueId, managerId). Indexes: (leagueId, sport), (managerId).
- **ProfileEvidenceRecord** (`profile_evidence_records`): id (cuid), managerId, leagueId, sport, evidenceType (VarChar 48), value (Float), sourceReference (VarChar 256 optional), createdAt, profileId (optional FK to ManagerPsychProfile, onDelete Cascade). Indexes: (managerId, leagueId), (evidenceType, sport).

Run migration when ready: `npx prisma migrate dev --name add_psychological_profiles`.

---

## 4. Profile and Evidence Integration Updates

- **ManagerPsychology (League Rankings):** On expand, fetches GET `/api/leagues/[leagueId]/psychological-profiles?managerId=[rosterId]`. If an engine profile exists and has labels, shows “Behavior labels” chips and “Why this profile?” button. That button calls POST `/api/leagues/[leagueId]/psychological-profiles/explain` with `{ profileId }` and displays the narrative. Same block is shown when only engine profile exists (before AI psychology loads) and when both AI and engine profiles exist.
- **APIs:** GET list (with optional sport, managerId for single), GET by profileId, POST run (managerId, sport, sleeperUsername, rosterId), POST explain (profileId).
- **Trade analyzer / draft room:** No direct widget changes in this pass. Engine profiles can be consumed by trade analyzer or draft room by calling GET by leagueId + managerId to show “Manager style: trade-heavy, aggressive” context; integration points are documented for future use.

---

## 5. Full UI Click Audit Findings

| Location | Element | Handler | State / API | Status |
|----------|--------|---------|-------------|--------|
| **ManagerPsychology** | Expand/collapse header | `fetchProfile` / toggle `isOpen` | Opens panel; first open triggers AI POST; useEffect loads engine profile when open | OK |
| **ManagerPsychology** | “Why this profile?” (engine only) | onClick fetch explain, toggle `explainNarrative` | POST psychological-profiles/explain; state shows/hides narrative | OK |
| **ManagerPsychology** | “Why this profile?” (with AI profile) | Same | Same | OK |
| **ManagerPsychology** | Re-analyze | `regenerate()` | POST manager-psychology; clears profile, refetches | OK |
| **LeagueRankingsV2Panel** | ManagerPsychology per team | Passes leagueId, rosterId, username, teamData | Renders per team; leagueId is from parent (app league id) | OK |
| **GET psychological-profiles** | N/A (called from component) | useEffect / fetch | ?managerId= returns single profile; no managerId returns list | OK |
| **POST psychological-profiles/run** | Not yet in UI | — | Run engine for one manager; can be added to league settings or manager card | Documented |
| **POST psychological-profiles/explain** | “Why this profile?” | fetch in ManagerPsychology | Returns narrative + evidencePreview | OK |

**Notes:**

- Sport and season filters: list endpoint supports `sport`; no season filter on profiles (profiles are current snapshot). Comparison views: list returns all league profiles; a dedicated comparison view can filter client-side by managerIds.
- Refresh: ManagerPsychology does not currently “Refresh” engine profile; reopening the panel re-runs the GET so a new run will show after next open. Re-analyze only refreshes AI profile.
- Loading/error: Loading state for AI psychology; error state for failed fetch. Engine profile load is fire-and-forget (no loading spinner); explain shows narrative when loaded.

---

## 6. QA Findings

- **Profile labels:** Generated from thresholds; trade-heavy, waiver-focused, aggressive, etc. appear when signals exceed defaults. Manual check: run engine for a manager with trade history and confirm labels and scores.
- **Evidence records:** Created on every engine run; types include trade_frequency, waiver_activity, rookie_vs_veteran, rebuild_contention, risk_taking. Evidence count visible on profile view.
- **Sport filter:** List and engine use normalized sport; list query filters by sport when provided.
- **Manager comparison:** List returns all profiles for league; comparison can be implemented by fetching list and filtering by two managerIds.
- **Trade analyzer / draft room:** No UI changes in this deliverable; engine is ready for GET by (leagueId, managerId) to inject profile context.
- **AI explanation:** Explain uses current profile and evidence from DB; “Why this profile?” uses engine profile id from the same session.
- **Click paths:** Expand, Re-analyze, and “Why this profile?” are wired; no dead buttons identified.

---

## 7. Issues Fixed

- **BehaviorSignalAggregator:** Waiver count uses Roster.id (uuid); when caller does not have Roster.id, waiver count remains 0 (documented). Trade history uses sleeperLeagueId from League/platform; dynasty seasons supported.
- **ProfileLabelResolver:** “Chaos agent” used non-existent `signals.activityScore`; replaced with computed activity from tradeFrequencyNorm and waiverFocusNorm.
- **PsychologicalProfileEngine:** On update, evidence is deleted and re-created; profileId set when creating evidence records.
- **ManagerPsychology:** Added engine profile fetch (GET by managerId), behavior labels section, and “Why this profile?” with explain API; show labels with or without AI profile loaded.

---

## 8. Final QA Checklist

- [ ] Run Prisma migration for ManagerPsychProfile and ProfileEvidenceRecord.
- [ ] For a league/manager with trade history: POST run (leagueId, managerId, sleeperUsername), then GET list or GET ?managerId=; confirm profile and labels.
- [ ] In League Rankings, open Manager Psychology for a team; confirm engine labels appear if profile exists, and “Why this profile?” returns narrative.
- [ ] Filter list by sport; confirm only that sport’s profiles returned.
- [ ] Confirm existing Manager Psychology AI (Re-analyze) still works and archetype/traits display.
- [ ] Confirm no duplicate or orphaned evidence after multiple engine runs.

---

## 9. Explanation of the Psychological Profiles Engine

The Psychological Profiles Engine is a league-scoped, evidence-based system that:

1. **Aggregates behavior signals** from trades (LeagueTradeHistory/LeagueTrade) and waivers (WaiverClaim by Roster): volume, frequency, rookie vs veteran acquisitions, picks in/out, and derived aggression and risk norms.
2. **Resolves profile labels** (aggressive, conservative, trade-heavy, waiver-focused, quiet strategist, chaos agent, value-first, rookie-heavy, win-now, patient rebuilder) using configurable thresholds so labels are grounded in data, not random.
3. **Stores one ManagerPsychProfile per (leagueId, managerId)** with numeric scores (aggression, activity, trade frequency, waiver focus, risk tolerance) and a JSON array of labels, plus **ProfileEvidenceRecord** rows linking evidence type and value to the profile.
4. **Exposes** list/detail, run (single manager), and explain (narrative + evidence preview) via API, and integrates into the Manager Psychology card in League Rankings with behavior badges and “Why this profile?”.
5. **Supports all required sports** (NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer) via sport normalization and optional sport-specific thresholds (e.g. trade frequency bar).

It is designed to work alongside the existing AI manager psychology (archetypes and narrative): the engine provides persistent, evidence-based labels and scores; the existing endpoint continues to provide rich AI-generated archetype and tendencies. Trade analyzer and draft room can later consume the engine profile for behavioral context.
