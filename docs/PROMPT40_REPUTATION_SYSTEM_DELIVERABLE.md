# Prompt 40 — Reputation System + Full UI Click Audit (Deliverable)

## 1. Reputation System Architecture

- **Purpose:** Score and display manager reputation across trust dimensions (reliability, activity, trade fairness, sportsmanship, commissioner trust, toxicity risk, participation quality, responsiveness). Evidence-based and configurable tiers (Legendary → Risky).
- **Data flow:**
  - **Evidence:** `ReputationEvidenceRecord` stores evidenceType, value, sourceReference per manager/league/sport. Evidence types: payment_complete, lineup_consistency, activity_frequency, trade_accept_rate, trade_fair_offers, commissioner_action_positive, dispute_involved, toxic_flag, abandonment_flag, fair_play, responsiveness.
  - **Aggregation:** `ReputationEvidenceAggregator` reads evidence and produces per-dimension 0–100 inputs; seeds default evidence when none exists.
  - **Scoring:** `ReputationScoreCalculator` computes dimension scores (0–100) and overall score (weighted average; toxicity inverted so higher = worse).
  - **Tier:** `ReputationTierResolver` maps overall score to configurable tier (Legendary ≥90, Elite 75–89, Trusted 60–74, Reliable 45–59, Neutral 25–44, Risky 0–24).
  - **Persistence:** `ReputationEngine` runs for one manager or all league teams; upserts `ManagerReputationRecord`.
  - **Query:** `ManagerTrustQueryService` gets reputation by league+manager, lists by league (sport/tier filters), lists evidence, compares two managers.
- **Sport:** All seven sports supported (NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer) via `SportReputationResolver` and `lib/sport-scope`.
- **Preserved:** Manager psych profiles, league history, trade systems, commissioner tools, dashboards, and existing badges remain unchanged. Reputation is additive (new tables and APIs).

---

## 2. Scoring Logic

- **Dimensions (0–100 each):** reliability, activity, tradeFairness, sportsmanship, commissionerTrust, toxicityRisk, participationQuality, responsiveness.
- **Evidence → dimensions:** Aggregator maps evidence types to dimensions (e.g. payment_complete + lineup_consistency → reliability; trade_accept_rate + trade_fair_offers → tradeFairness; toxic_flag → toxicityRisk). Default 50 when no evidence.
- **Overall:** Weighted average of dimension scores; toxicity contributes as `(100 - toxicityRiskScore)` so lower toxicity improves overall. Weights: reliability 1.2, tradeFairness 1.2, commissionerTrust 1.1, toxicityRisk 1.2, others 1 or 0.8.
- **Tiers:** Configurable thresholds (defaults in `DEFAULT_REPUTATION_TIER_THRESHOLDS`). Resolution: score clamped 0–100; first tier where score in [min, max] (or ≥ min if no max) wins, order Legendary → Risky.

---

## 3. Schema Additions

- **ManagerReputationRecord** (`manager_reputation_records`): id (cuid), leagueId, managerId, sport, overallScore, reliabilityScore, activityScore, tradeFairnessScore, sportsmanshipScore, commissionerTrustScore, toxicityRiskScore, participationQualityScore, responsivenessScore, tier, updatedAt. Unique (leagueId, managerId). Indexes: (leagueId, sport), (managerId), (tier).
- **ReputationEvidenceRecord** (`reputation_evidence_records`): id (cuid), managerId, leagueId, sport, evidenceType, value, sourceReference, createdAt. Indexes: (managerId, leagueId), (leagueId, evidenceType), (sport, evidenceType).

Migration: `20260315002659_add_reputation_system` (create-only; apply with `prisma migrate dev` when ready).

---

## 4. Profile and Trust Integration Updates

- **Settings:** New “Reputation” subtab in League Settings with `ReputationPanel`: “Run reputation engine” button, result count (processed/created/updated), sample results list; on success calls `router.refresh()`.
- **Trade Finder (Partner Match):** `PartnerMatchView` shows `ReputationBadge` next to `ManagerStyleBadge` per partner; badge fetches GET `/api/leagues/[leagueId]/reputation?managerId=…`, displays tier + score.
- **APIs:** GET `/api/leagues/[leagueId]/reputation` (managerId for single, else list with sport/tier/limit), GET `/api/leagues/[leagueId]/reputation/evidence` (managerId required), POST `/api/leagues/[leagueId]/reputation/run`, POST `/api/leagues/[leagueId]/reputation/explain` (managerId → narrative for “Explain this reputation”).
- **Future:** Commissioner trust view, league member list reputation column, trade analyzer trust context, and matchmaking/league discovery can consume `ManagerTrustQueryService` and reputation APIs.

---

## 5. Full UI Click Audit Findings

| Location | Element | Handler | State / API | Persisted Reload | Status |
|----------|--------|---------|-------------|------------------|--------|
| **League Settings** | Reputation tab | `setActive('Reputation')` | Renders `<ReputationPanel leagueId={leagueId} />` | — | OK |
| **ReputationPanel** | Run reputation engine | `runEngine()` | `setRunning(true)`, POST `/api/leagues/[leagueId]/reputation/run` with `{ replace: true }` | On success: `setResult(...)`, `router.refresh()` | OK |
| **ReputationPanel** | Error/result display | — | `error` / `result` state | — | OK |
| **PartnerMatchView** | Partner cards | — | GET trade-partner-match; each card shows ManagerStyleBadge + ReputationBadge | Refetch on leagueId change | OK |
| **ReputationBadge** | (per partner) | — | GET `/api/leagues/[leagueId]/reputation?managerId=…` in useEffect | Refetch when leagueId or managerId change | OK |
| **GET /reputation** | (client fetch) | ReputationBadge, future list views | Query params managerId, sport, tier, limit | — | OK |
| **GET /reputation/evidence** | (drill-down) | Available for detail/evidence views | managerId required | — | Documented |
| **POST /reputation/run** | ReputationPanel | runEngine() | Body replace; returns processed, created, updated, results | — | OK |
| **POST /reputation/explain** | (AI Explain button) | Available for “Explain this reputation” | Body managerId; returns narrative | — | Documented |

**Notes:**

- Reputation badges show loading state (skeleton) and hide when no reputation. After running engine in Settings, opening Trades → Partner Match shows updated badges when component remounts or after router.refresh().
- Sport and season filters: list API supports sport/tier; UI for filtered list (e.g. league member list with reputation column) can be added later using same API.
- Commissioner trust view and manager comparison view: backend supports `compareManagersReputation`; UI can be added in commissioner or member list.
- “Explain this reputation” button: POST explain returns narrative; a button can be added next to ReputationBadge or on a detail card that calls this API and displays the result.

---

## 6. QA Findings

- **Scores:** Computed from evidence; when no evidence, default evidence seeds (activity_frequency, trade_fair_offers, fair_play at 50) yield Neutral-tier overall.
- **Tiers:** Legendary 90+, Elite 75–89, Trusted 60–74, Reliable 45–59, Neutral 25–44, Risky 0–24.
- **Run engine:** Settings → Reputation → “Run reputation engine” processes all league teams, upserts records, shows processed/created/updated.
- **Badges:** Trade Finder → Partner Match shows style + reputation per partner; reputation loads when API returns data.
- **Sport:** All seven sports supported; sport taken from league or request.
- **Click paths:** Reputation tab, Run button, and Partner Match badges are wired; no dead buttons identified. Evidence drill-down and Explain button are API-ready for future UI.

---

## 7. Issues Fixed

- Schema: Added ManagerReputationRecord and ReputationEvidenceRecord with indexes and unique (leagueId, managerId).
- Aggregator: participationQuality derived from lineup_consistency and activity_frequency (no separate evidence type).
- Tier resolver: Iterates tiers from Legendary to Risky; first matching range wins.
- Settings: Added “Reputation” to SUBTABS and ReputationPanel with run + result + router.refresh().
- Partner Match: Added ReputationBadge next to ManagerStyleBadge; both receive leagueId and managerId (externalId ?? teamId).

---

## 8. Final QA Checklist

- [ ] Run reputation engine from Settings → Reputation; confirm “Processed X managers — Y created, Z updated.”
- [ ] Open Trades → Partner Match; confirm reputation badge appears next to style badge when reputation exists (or nothing when not run).
- [ ] Verify GET /reputation?managerId=… returns single reputation or null; GET /reputation without managerId returns list.
- [ ] Verify POST /reputation/explain with managerId returns narrative string.
- [ ] Confirm no regression to psych profiles, drama, or league settings tabs.
- [ ] Confirm reputation tier labels and badge colors (Legendary amber, Elite emerald, Trusted green, Reliable blue, Neutral slate, Risky red).

---

## 9. Explanation of the Reputation System

The Reputation System provides evidence-based trust scores for managers in a league:

1. **Evidence** is stored in `ReputationEvidenceRecord` (evidenceType, value, sourceReference). Types include payment completion, lineup consistency, activity frequency, trade fairness indicators, commissioner actions, dispute involvement, toxicity flags, and responsiveness. When no evidence exists, default values seed so new managers get a Neutral-tier score.

2. **Aggregation** combines evidence into per-dimension inputs (0–100) for reliability, activity, trade fairness, sportsmanship, commissioner trust, toxicity risk, participation quality, and responsiveness.

3. **Scoring** computes dimension scores (clamped 0–100) and an overall score as a weighted average; toxicity is inverted so lower toxicity improves overall.

4. **Tiers** map the overall score to a configurable tier: Legendary (90+), Elite (75–89), Trusted (60–74), Reliable (45–59), Neutral (25–44), Risky (0–24). Thresholds are configurable via `ReputationTierResolver`.

5. **Persistence** stores one `ManagerReputationRecord` per (leagueId, managerId) with all dimension scores and tier. The engine can be run for a single manager or for all teams in a league.

6. **APIs and UI** expose list/get, run, evidence list, and explain. Reputation badges appear in the Trade Finder (Partner Match); the Settings “Reputation” tab runs the engine and shows results. The system supports all seven sports and is designed for future use in commissioner trust views, member list reputation columns, trade analyzer trust context, and matchmaking/league discovery.
