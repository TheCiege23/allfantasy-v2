# Product Requirements Document: Big Brother League Mode

**Product:** AllFantasy.AI  
**Document version:** 1.1 (scope locked for build)  
**Owner:** Product  
**Status:** Approved for engineering handoff — resolved decisions integrated  

**Version history**

| Version | Date | Summary |
|---------|------|---------|
| 1.0 | — | Initial PRD (draft). |
| 1.1 | — | Commissioner subscription, eviction/fantasy, single winner, abandonment/AI, vote privacy, strict rules, double eviction, trades, jury, league size/finale week, Chimmy chat scope, compliance/dues — **locked**. |

---

## 1. Executive summary

**Big Brother League** is a **redraft** fantasy league mode across **NFL, MLB, NBA, NHL, NCAA Basketball (NCAAB), NCAA Football (NCAAF), and Soccer**, with a **Big Brother–style social elimination** layer: HOH, nominations, POV, replacement nominee, eviction votes, jury, and finale.

- **Fantasy core** remains a standard redraft league (draft, lineups, scoring, waivers, trades per league settings) until a manager is **BB-evicted**.
- **On BB eviction**, the manager is **removed from their team**, **all players go to waivers**, and that **team does not score** for the rest of the season.
- **Winner rule (locked):** The **Big Brother winner and the fantasy league champion must be the same person** — one converged outcome; engineering must enforce a single deterministic rule (see §6.3).
- **AI:** **Chimmy** is the league AI assistant. **All AI features** for this mode require an **active AF Commissioner subscription on the commissioner account** (monthly). If subscription lapses, the commissioner **runs the league manually**; AI automation and Chimmy-gated flows stop.
- Chimmy must **not** expose individual sealed ballots before season end (§5.2).

---

## 2. Problem statement and user need

### 2.1 Problem

- Fantasy leagues lack a **fair, auditable** social elimination structure.
- Commissioners rely on spreadsheets and DMs.
- Players need clarity on **fantasy + BB** interaction, especially after eviction.

### 2.2 User need

- One app of record for phases, deadlines, votes, and results.
- **Trust:** scoring and eviction side effects are **server-authoritative** and logged.
- **Mobile-first** voting and nominations.

---

## 3. Goals and KPIs

| ID | Goal | Target direction |
|----|------|------------------|
| G1 | BB setup completable without support | ≥75% beta leagues complete template + first phase |
| G2 | No stuck phases | <2% leagues/week need commissioner force-advance |
| G3 | Engagement vs redraft control | +25% weekly sessions (hold sport/size constant) |
| G4 | Support burden | BB dispute tickets <5% active BB managers/month |
| G5 | Commissioner AI attach | Track attach rate + ARPU (targets TBD with finance) |

**KPIs:** BB activation rate, phase latency (p50/p95), vote participation, Chimmy usage (subscription-gated events), retention, incident rate.

---

## 4. User personas

| Persona | Core need |
|---------|-----------|
| **Commissioner** | Templates, deadlines, audit log, manual fallback when AI/sub lapses, abuse controls |
| **Competitive manager** | Fair rules, strict defaults, clear eligibility |
| **Casual manager** | Simple vote/nomination UX, low friction |
| **Jury member** | BB-only participation post-eviction; no fantasy team |

---

## 5. Locked product decisions (v1.1 — authoritative)

These **replace** any conflicting text from earlier drafts.

### 5.1 Subscription (commissioner, monthly)

- **AF Commissioner** is billed **monthly** and tied to the **commissioner user**.
- **Lapse:** All **AI** and **AI-driven automation** for BB (including **Chimmy running a team**) **stop**. Commissioner **runs the league manually** (phase advances, tie-breaks, etc.) with **audit trail**.
- **Enforcement:** **Frontend + backend** must gate AI features and automated AI team control on `commissionerSubscriptionActive === true` (exact flag name is implementation detail).

### 5.2 Eviction and fantasy team (post-eviction)

- Manager is **removed from their fantasy team**; **all players enter waivers** (standard league waiver pipeline).
- **No scoring** for that team afterward (no ghost team, no frozen scoring roster).

### 5.3 Single winner

- **BB winner ≡ fantasy league champion** (same `userId` / same person for trophies and official outcome).
- Engineering **must** implement **one** convergence algorithm (§6.3).

### 5.4 Roster churn and abandonment

- **No** replacement users. **No** mid-season joins to the BB house.
- **Manager leaves / abandons:**
  - If commissioner has **active AF Commissioner** subscription → **Chimmy runs that team** (lineup/waiver behavior in implementation spec).
  - If **no** active subscription → **automatic BB eviction** (and §5.2 applies). **No eviction vote** (audited: e.g. `auto_evict_abandonment_no_ai`).

### 5.5 Vote visibility

- **Julie Chen–style:** public **ceremony** and outcome (e.g. evicted user, aggregate vote count as designed).
- **Private ballots:** **who voted whom** is **not revealed until the season ends** (finale/post-season reveal — exact trigger in implementation spec).

### 5.6 Rules strictness

- **Strict Big Brother defaults** for eligibility (HOH, voters, nominees, etc.).
- Commissioner **cannot** override core BB mechanics for a “casual” ruleset in v1; tools are **timing, pause, force advance, audit**, and **jury timing** within allowed parameters (§5.9).

### 5.7 Double eviction

- Allowed **only** when **schedule math** requires finishing BB before the season timeline (too many teams vs available weeks). Not for optional drama.

### 5.8 Trades and eviction

- **No:** pending trades **do not settle after** the manager is evicted — **void/cancel** per implementation spec, with user-visible explanation + audit.

### 5.9 Jury

- **Default:** **Automatic** jury start at configured threshold.
- **Commissioner** may **change** jury timing/settings within **documented, allowed** parameters; changes **audited**.

### 5.10 League size and finale week

- **Minimum 12**, **maximum 18** managers.
- Cap may be **reduced** if the sport’s **regular-season week count** cannot support the BB calendar.
- **Final BB vote** must occur **one week before the regular season ends** (sport-aware calendar).

### 5.11 Chimmy and league chat

- With **active Commissioner** subscription, Chimmy may use **past league chat** for recaps/summaries, subject to moderation, retention, and reporting.

### 5.12 Compliance and money

- **No gambling** on platform.
- **League dues are not collected on the site.**
- NCAA/regional copy stays compliant; no minors-targeting gambling tone.

---

## 6. Architectural / gameplay requirements

### 6.1 Sport scope

- All **seven** supported sports (single source of truth: `lib/sport-scope.ts` — NFL, NHL, NBA, MLB, NCAAB, NCAAF, Soccer).
- **Redraft only** for v1 unless product explicitly expands.

### 6.2 Permissions after BB eviction (replaces legacy “Table A”)

| Capability | In house | BB-evicted (incl. jury) |
|------------|----------|-------------------------|
| Fantasy lineup / waivers / trades | Per league rules | **No** (team removed, §5.2) |
| BB votes / comps | If eligible | Jury/finale only as rules state |
| League chat | Per league settings | Read-only or muted per product policy |

### 6.3 Winner convergence (engineering mandatory)

Choose **one** and document in tech spec:

- **Option A:** BB cannot conclude until **one** manager remains with a scoring path aligned to fantasy champion resolution, **or**
- **Option B:** In BB leagues, **fantasy champion** is defined so it **cannot diverge** from BB winner (e.g. last remaining manager’s team wins by rule).

**QA:** No season may ship with two different “winners.”

### 6.4 Phase state machine

- **Server-authoritative** persisted state; idempotent transitions; deadlines in **UTC**; display in user timezone.
- Commissioner: **force advance**, **pause** (P1 if not v1), **audit log** (P0).

### 6.5 Competitions (HOH / POV)

- Default competition: **fantasy points for the BB week** among eligible houseguests, with **lock** aligned to existing lineup/scoring locks.
- Tie-breakers: **configurable** (bench points, prior HOH, commissioner pick window, etc.) — exact order **locked in commissioner template** at season start.
- **Stat correction replay** for HOH/POV after award: **out of v1** unless sev-1; track as P2.

---

## 7. Feature list (priority and ownership)

**Legend:** FE = frontend, BE = backend, AI = Chimmy/orchestration.

| ID | Feature | P | Owner | Notes |
|----|---------|---|-------|--------|
| BB-001 | Enable BB on redraft league (7 sports) | P0 | FE, BE | Feature flag. |
| BB-002 | BB week ↔ scoring week (sport resolver) | P0 | BE | No NFL-only assumptions. |
| BB-003 | House roster (12–18, calendar validation) | P0 | BE, FE | No mid-season join. |
| BB-004 | Phase state machine + cron/deadlines | P0 | BE | Idempotent; lapse → manual if no AI. |
| BB-005 | HOH / nominations / POV / veto / replacement / vote / eviction | P0 | FE, BE | Strict defaults. |
| BB-006 | Jury + finale + **converged winner** | P0 | FE, BE | §6.3 |
| BB-007 | Eviction → waivers + stop scoring | P0 | BE | §5.2 |
| BB-008 | Abandonment → AI team OR auto-evict | P0 | BE, AI | §5.4 + subscription |
| BB-009 | Vote ceremony + sealed ballots until season end | P0 | FE, BE | §5.5 |
| BB-010 | Pending trades void on eviction | P0 | BE | §5.8 |
| BB-011 | Double eviction (schedule-math only) | P1 | BE, FE | §5.7 |
| BB-012 | Notifications (in-app + email min) | P1 | FE, BE | Push if ready |
| BB-013 | Chimmy: explainers, reminders, recaps (gated) | P1 | AI, FE, BE | Chat allowed §5.11 |
| BB-014 | Commissioner panel: jury timing override | P0 | FE, BE | §5.9 |
| BB-015 | Audit log + export | P0 | BE, FE | |
| BB-016 | Moderation hooks (report/block) | P0 | BE, FE | |

---

## 8. Detailed user flows (summary)

Flows follow **strict BB defaults** unless noted. All mutations **authorized server-side**.

1. **HOH:** Eligible set computed; competition (default: weekly fantasy points); tie-break; award `hohUserId`; advance.
2. **Nominations:** HOH picks N nominees (default N=2); validate; deadline + commissioner fallback policy if missed.
3. **POV:** Player pick (if used) → POV comp among pool → `povHolderUserId`.
4. **Veto ceremony:** Use/not use; if use, replacement nominee per rules; finalize nominees.
5. **Eviction vote:** Eligible voters submit **private** ballot; tally; tie-break (e.g. HOH break); **public outcome** at reveal; **per-voter choice sealed** until season end.
6. **Eviction:** Apply §5.2, §5.8; juror pool update; next phase or finale path.
7. **Jury / finale:** Automatic jury start (§5.9); finale vote; **single winner** with fantasy champion (§6.3).
8. **Subscription lapse:** Disable AI team + Chimmy automation; commissioner manual ops only.
9. **Abandonment:** Branch per §5.4.

---

## 9. Non-functional requirements

- **Performance:** Phase dashboard usable on mid-tier mobile; read state APIs p95 targets per platform SLOs.
- **Security:** Role checks on every mutation; sealed vote ACLs; Chimmy no pre-reveal individual ballots.
- **Scalability:** `leagueId` + `bbSeasonId` partitioning; idempotent cron.
- **Reliability:** If AI provider down, **mechanical BB + manual commissioner** still work.
- **A11y / i18n:** WCAG 2.1 AA on vote/nomination; English v1; Spanish per platform patterns.
- **Analytics:** `bb_*` events including subscription flag on Chimmy usage.

---

## 10. Out of scope (v1)

- Video / clip rights.
- Real-money wagering; **dues collection on platform** (forbidden).
- America’s vote outside the league house.
- Battle backs, secret partners, arbitrary double eviction (non-schedule-math).
- Non-redraft BB without explicit product approval.
- Cross-league BB.

---

## 11. Launch criteria

- [ ] Feature flag; E2E **one path per sport** (smoke).
- [ ] Subscription **on/off**: AI team, Chimmy, automation; **manual** path verified on lapse.
- [ ] Eviction → **waivers + no score** (all sports).
- [ ] **Winner convergence** — no split BB vs fantasy champion.
- [ ] Abandonment branches tested.
- [ ] Trades **void** when eviction blocks settlement.
- [ ] Vote: **public outcome**, **private ballot** until season end.
- [ ] Schedule: **final vote = regular season end − 1 week**; **12–18** managers validated vs weeks.
- [ ] Double eviction only when **schedule validator** allows.
- [ ] Legal/copy sign-off; support macros; runbook (force advance, disable BB, emergency).

---

## 12. Implementation specifications still to write (not product open questions)

These are **tech design** deliverables, not unresolved PRD ambiguity:

1. **Chimmy-run team:** Lineup strategy, waiver rules, trade prohibition, rate limits, safety rails.
2. **Data model:** Exact steps for roster dissolution + waiver batch + scoring exclusion.
3. **Chosen winner convergence** option (§6.3) + edge cases (tie, co-finalists).
4. **Season-end trigger** for revealing individual ballots (immediately post-finale vs post championship lock).
5. **Double eviction** algorithm tied to **weeks remaining** and **house size**.

---

## 13. References (internal)

- Database schema (Prisma / PostgreSQL / Redis / audit): `docs/DATABASE_SCHEMA_BIG_BROTHER_LEAGUE.md`
- Backend automation (cron, ticks, idempotency, commissioner fallback): `docs/BIG_BROTHER_AUTOMATION_ENGINE.md`
- UX journey tables (Figma) + Chimmy command parser spec: `docs/UX_BIG_BROTHER_JOURNEY_AND_COMMANDS.md`
- Narrative BB flows: `docs/UX_FLOWS_BIG_BROTHER_LEAGUE.md`
- Supported sports: `lib/sport-scope.ts`
- Chimmy / AI commissioner precedent: `docs/PROMPT232_CHIMMY_AI_SYSTEM_ARCHITECTURE.md`, `docs/PROMPT39_AI_COMMISSIONER_CORE_ARCHITECTURE_DELIVERABLE.md`
- Orphan / AI manager patterns: `docs/PROMPT181_ORPHAN_AI_MANAGER_DELIVERABLE.md`
- Monetization / subscription patterns: `docs/PROMPT261_AF_COMMISSIONER_MONETIZATION_UX.md`, `docs/PROMPT259_SUBSCRIPTION_VS_TOKEN_ACCESS_POLICY.md`

---

**End of PRD v1.1**
