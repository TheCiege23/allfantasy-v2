# Fantasy OS Suite — Progress Dashboard

**Phase D Increment 10, updated by Increments 11, 12, 13, and 14.** A single, scannable status view across the whole
OS suite — a companion to
[`FANTASY_OS_SUITE_CLIENT_AGNOSTIC_ROADMAP.md`](FANTASY_OS_SUITE_CLIENT_AGNOSTIC_ROADMAP.md) (the
prose narrative), [`SLEEPER_OS_SUITE_PROOF_CHECKLIST.md`](SLEEPER_OS_SUITE_PROOF_CHECKLIST.md) /
[`SLEEPER_PROOF_EXECUTION_PACKET.md`](SLEEPER_PROOF_EXECUTION_PACKET.md) (the procedure), and
[`CUSTOMER_DEMO_READINESS_AUDIT.md`](CUSTOMER_DEMO_READINESS_AUDIT.md) (the demo-readiness detail).
This doc answers one question fast: **where does each OS and the Sleeper proof stand right now?**
Update it whenever a Phase D increment lands.

---

## 1. The five OS products

| OS | Answers | Status | Key file(s) | Route/UI |
| --- | --- | --- | --- | --- |
| **Decision OS** | What is happening across the platform, and why? | Real, tested. The shared brain every other OS reads. | `lib/decision-os/behavioral/*` | Not a UI itself |
| **Commissioner OS** | What should this commissioner do? | **Built, live.** | `lib/decision-os/missionControl.ts`, `leagueAnalytics.ts` | `/commissioner-hub` |
| **User OS / Manager OS** | What should this manager do to compete better? | **Built, live.** (Phase D Inc. 5) | `lib/decision-os/userOs.ts` | `/league/[leagueId]` (`UserOsCard`) |
| **Platform OS** | What should the platform operator do? | **Built, authorized, has a minimal admin UI.** (Phase D Inc. 4/11/12) | `lib/decision-os/platformOs.ts`, `platformOsAuthorization.ts`, `PlatformOsOperatorPanel.tsx` | `GET /api/decision-os/platform-os` + `/admin` "Platform OS" panel (site-admin only) |
| **DFS OS** | (deferred) | Does not exist. Pending legal/compliance review. | — | — |

## 2. Richer, still-shadow-gated intelligence (decided, not cut over)

| Layer | Status | Decided by |
| --- | --- | --- |
| Phase 5.3 League Behavioral Intelligence | Shadow-gated. **No internal UI cutover.** | `PLATFORM_INTELLIGENCE_CUTOVER_ADR.md` (Inc. 9) |
| Phase 5.4 Platform Behavioral Intelligence | Shadow-gated. **No internal UI cutover.** | same |
| Phase 5.5–5.10 external hosted `/api/v1/intelligence/*` | **Accepted, built, staging-verified** (real test API keys in `.env.staging`). Blocked only on a **production** enablement decision (business/ops call). | `ADR_F5_10_STAGING_VERIFICATION.md` |

## 3. Real Sleeper proof — readiness

| Step | Script | Writes? | Executed live in this sandbox? |
| --- | --- | --- | --- |
| 1. Seed imported league | `decision-os-import-sleeper-nonprod.ts` | Yes (League/LeagueTeam/Roster) | No — no live network access here |
| 2. Dry-run activity ingest | `decision-os-ingest-sleeper-activity-nonprod.ts --dryRun` | No (Inc. 10) | No |
| 3. Real activity ingest | `decision-os-ingest-sleeper-activity-nonprod.ts` | Yes (`DecisionOsImportedActivity`) | No |
| 4. Snapshot capture (optional, Inc. 14) | `GET /api/cron/decision-os-snapshot-capture` | Yes (one `BehavioralSnapshot` row) | No |
| 5. Suite conformance | `decision-os-suite-conformance.ts` | No (read-only) | No |
| 6. Browser checks | `/commissioner-hub`, `/league/[leagueId]`, `/admin` (Platform OS panel, Inc. 14) | No | No |

**Everything is execution-ready** (real, type-correct, unit-tested logic; every command copy/paste-
ready once placeholders in `SLEEPER_PROOF_EXECUTION_PACKET.md` are filled in). **Nothing has been run
against a live Sleeper league or a live non-prod database in this sandbox** — that requires a real
non-prod `DATABASE_URL` and a real Sleeper account/league, neither of which exist in this environment.

## 4. Customer demo readiness (Increment 13, docs fixed in Increment 14)

Full detail in [`CUSTOMER_DEMO_READINESS_AUDIT.md`](CUSTOMER_DEMO_READINESS_AUDIT.md). Headline:
**zero engineering blockers** — every gap found is either "hasn't been run yet" or a one-time
operational/environment step, not missing code.

| Kind | Item | Status |
| --- | --- | --- |
| Operational blocker | Sleeper proof chain has never been run live against real infrastructure | Still open — needs real credentials |
| Operational blocker | No customer-reachable environment established yet (local dev + screen-share, or a Vercel preview, both work — zero engineering) | Still open — an operator's choice to make |
| Operational blocker | Demo presenter's account needs `ADMIN_EMAILS` access in the demo environment to show Platform OS | Now documented (Inc. 14) — still an operator step to actually do |
| Polish | Snapshot-capture route (`/api/cron/decision-os-snapshot-capture`) wasn't in the execution packet — without it every trend panel shows "no snapshots yet" | **Fixed (Inc. 14)** — new §3c/Step 4 in both proof docs |
| Polish | `SLEEPER_OS_SUITE_PROOF_CHECKLIST.md` §8 was stale — said Platform OS has no route/UI | **Fixed (Inc. 14)** — rewritten with real route/UI + browser step |
| Polish | A second imported league would make Platform OS's healthy/at-risk split more visually compelling | Recommendation now documented (Inc. 14) — running it is still operational |
| Polish | Platform OS admin panel has never rendered in a live browser, only in component tests | Still open — no browser-reachable environment available in this sandbox |

## 5. Phase D increment history

| # | Name | Delivered | Commit |
| --- | --- | --- | --- |
| 1 | Client-agnostic roadmap reframing | Roadmap doc, no code | — |
| 2 | User OS / Manager OS Sleeper proof audit | Audit doc | — |
| 3 | Platform OS / Client Intelligence audit | Audit doc | — |
| 4 | Minimum Platform OS surface | `platformOs.ts`, 7 tests | `4e3dd4984` |
| 5 | Minimum User OS surface | `userOs.ts`, route, card, 18 tests | `5b3ff4659` |
| 6 | Real Sleeper proof plan + conformance harness | `decision-os-suite-conformance.ts`, checklist doc, 12 tests | `10535da19` |
| 7 | Sleeper imported-activity orchestration | `decision-os-ingest-sleeper-activity-nonprod.ts`, 16 tests | `ac2f75d72` |
| 8 | Runbook hardening | Flag rename, silent-fetch warning, troubleshooting doc, 3 more tests | `333a1fddf` |
| 9 | Platform Intelligence cutover ADR | `PLATFORM_INTELLIGENCE_CUTOVER_ADR.md`, 1 comment fix | `0d03a8e10` |
| 10 | Real execution prep | Execution packet + dashboard + `--dryRun` | `9e90a5c1a` |
| 11 | Platform OS operator authorization | `platformOsAuthorization.ts`, `/api/decision-os/platform-os` route, 12 tests | `cf2d7ae5d` |
| 12 | Platform OS operator input UX | `PlatformOsOperatorPanel.tsx`, wired into `/admin`, 7 tests | `a47dba565` |
| 13 | Customer demo readiness audit | `CUSTOMER_DEMO_READINESS_AUDIT.md`, no code | `afdf2a06f` |
| 14 | Proof packet documentation cleanup | Checklist §3c/§8 rewrite, packet Step 4/6.4, no code | *(this commit)* |

## 6. Open, honestly-unresolved items

- Live execution of the Sleeper proof chain against a real non-prod DB + real Sleeper account — needs
  real credentials this sandbox doesn't have.
- Platform OS's admin UI has not been verified in a live browser — the dev server's first compile
  didn't finish inside this sandbox's available time, and `/admin` needs a real admin session this
  sandbox doesn't have regardless; component tests exercise the interactive flow instead (Inc. 12).
- Whether path 1 (internal UI cutover for Phase 5.3/5.4) is ever pursued — currently decided **no**.
- Whether path 2 (external Intelligence API) is ever enabled in production — a business/ops decision,
  not an engineering one.
- Sleeper ingestion is not wired into the live production backfill/sync call site — only into this
  non-prod orchestration script.
- Snapshot-capture cron exists but is not registered in `vercel.json` — no automatic scheduling yet.

## 7. Standing boundaries (unchanged since Phase D began)

No production DB touched. No fake/demo data. No auto-discovery of leagues. No DFS OS work. No
`the_replacements` provider work. PR #183 untouched (draft, unmerged). No Redraft/Start-Draft/PR-#166/
AF-hosted-league work. No measured retention/engagement/ROI outcome claimed anywhere.
