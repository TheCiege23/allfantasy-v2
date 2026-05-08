# World Cup Bracket Challenge Final QA and Deployment Readiness

Last updated: 2026-05-07
Scope: Prompt 9 final QA and deployment readiness for FIFA World Cup Bracket Challenge.

## 1. User Journey Smoke Test

### A. Core user flow

1. Create a World Cup bracket league from /brackets/world-cup or /brackets/world-cup/create.
2. Confirm challenge defaults:
- maxParticipants = 100
- maxEntriesPerParticipant = 5
- pickLockStrategy defaults to tournament_start
3. Open Invite tab/panel and copy invite link.
4. Join from invite as second user.
5. As participant, create Bracket 1.
6. Create Bracket 2.
7. Continue creating up to Bracket 5.
8. Confirm 6th bracket creation is blocked with a limit error.
9. Rename one unlocked bracket entry.
10. Delete one unlocked bracket entry (while still retaining at least one entry).
11. Open guided picker.
12. Make picks in multiple rounds.
13. Use AI matchup preview.
14. Use AI pick action.
15. Use AI bracket builder flow.
16. Confirm picks persist by entry (switch entries and verify independent selections).
17. Confirm leaderboard rows are entry-scoped (multiple entries from same user appear separately).

Pass criteria:
- No unauthorized 401/403 for expected logged-in owner/participant actions.
- Entry-level separation is preserved for picks, scoring, and rank.

## 2. Live Data Smoke Test

### B. Provider and sync flow

1. Set WORLD_CUP_DATA_PROVIDER=mock (or manual behavior) and run sync.
2. Run dry-run teams sync.
3. Run dry-run fixtures sync.
4. Run dry-run live sync.
5. Confirm live ticker reflects updated match states when matches are live/final.
6. Confirm matchup cards display score, status, and minute fields.
7. Confirm final match updates trigger recalculation path when recalculate=true.
8. Confirm leaderboard totals/ranks update after recalculate.

Pass criteria:
- Dry-run returns counts and warnings without DB writes.
- Live/final state transitions are visible in UI.

## 3. Locking Smoke Test

### C. Pick lock behavior

1. Set pickLockAt in the future for a challenge.
2. Confirm picks are editable and saves succeed.
3. Set pickLockAt in the past.
4. Confirm picks are blocked.
5. Confirm AI builder actions are blocked when locked.
6. Confirm entry delete is blocked when challenge/entry is locked.
7. Confirm guided picker is effectively read-only for locked state.

Pass criteria:
- Lock enforcement is server-side (returns 409/forbidden-style lock errors where applicable).

## 4. Admin Smoke Test

### D. Admin/owner controls

1. Open World Cup admin panel on a challenge.
2. Run integrity check.
3. Run sync teams dry-run.
4. Run sync fixtures dry-run.
5. Run sync live dry-run.
6. Run recalculate leaderboard.
7. Confirm launch checklist indicators render.

Pass criteria:
- Owner/admin guarded actions succeed for authorized users and fail for unauthorized users.

## 5. Mobile QA

### E. Small-screen validation surfaces

1. Entry dashboard
2. Guided picker
3. AI panel
4. Leaderboard
5. Invite panel
6. Live ticker
7. Admin panel

Recommended breakpoints:
- 375px (iPhone SE)
- 390px (iPhone 14)

Pass criteria:
- No clipped controls or unusable actions.
- Footer/nav controls remain reachable with safe-area padding.

## 6. API Route Inventory

### Public and user routes

| Method | Path | Purpose | Auth required | Owner/admin required |
|---|---|---|---|---|
| POST | /api/brackets/world-cup/create | Create challenge | Yes | No |
| GET | /api/brackets/world-cup/live | Read live/halftime match feed | No | No |
| POST | /api/brackets/world-cup/sync | Legacy sync trigger | Yes (admin path) | Site admin |
| GET | /api/brackets/world-cup/invite/[inviteCode] | Read invite details | No | No |
| POST | /api/brackets/world-cup/invite/[inviteCode] | Join by invite code | Yes | No |
| POST | /api/brackets/world-cup/invite/[inviteCode]/join | Join by invite code (alias) | Yes | No |

### Challenge routes

| Method | Path | Purpose | Auth required | Owner/admin required |
|---|---|---|---|---|
| GET | /api/brackets/world-cup/[challengeId] | Challenge view payload | Conditional by visibility | No for public, yes for private access |
| PATCH | /api/brackets/world-cup/[challengeId] | Update challenge settings | Yes | Owner/admin |
| POST | /api/brackets/world-cup/[challengeId]/join | Join challenge using challenge invite code | Yes | No |
| GET | /api/brackets/world-cup/[challengeId]/leaderboard | Leaderboard snapshot | Conditional by visibility | No for readable challenge |
| GET | /api/brackets/world-cup/[challengeId]/picks | Current user participant picks | Yes | No |
| POST | /api/brackets/world-cup/[challengeId]/picks | Legacy save picks endpoint | Yes | No |
| POST | /api/brackets/world-cup/[challengeId]/invite | Create additional invite | Yes | Owner/admin |
| POST | /api/brackets/world-cup/[challengeId]/recalculate | Recalculate challenge leaderboard | Yes | Owner/admin |

### Entry routes

| Method | Path | Purpose | Auth required | Owner/admin required |
|---|---|---|---|---|
| GET | /api/brackets/world-cup/[challengeId]/entries | List current user entries | Yes | No |
| POST | /api/brackets/world-cup/[challengeId]/entries | Create entry | Yes | No |
| GET | /api/brackets/world-cup/[challengeId]/entries/[entryId] | Entry detail | Optional (admin/private access logic) | No for owner of entry; admin override |
| PATCH | /api/brackets/world-cup/[challengeId]/entries/[entryId] | Rename entry | Yes | Entry owner |
| DELETE | /api/brackets/world-cup/[challengeId]/entries/[entryId] | Delete entry | Yes | Entry owner |
| POST | /api/brackets/world-cup/[challengeId]/entries/[entryId]/picks | Save one pick for entry | Yes | Entry owner |
| DELETE | /api/brackets/world-cup/[challengeId]/entries/[entryId]/picks | Clear downstream picks for entry | Yes | Entry owner |

### AI route

| Method | Path | Purpose | Auth required | Owner/admin required |
|---|---|---|---|---|
| POST | /api/brackets/world-cup/[challengeId]/ai/matchup-preview | AI deterministic/generative matchup preview | Yes | No (must be owner/participant/public readable challenge) |

### Admin integrity and data sync routes

| Method | Path | Purpose | Auth required | Owner/admin required |
|---|---|---|---|---|
| GET | /api/brackets/world-cup/[challengeId]/admin/integrity | Integrity report | Yes | Owner/admin |
| POST | /api/brackets/world-cup/admin/sync-teams | Team sync (global) | Yes | Site admin |
| POST | /api/brackets/world-cup/[challengeId]/admin/sync-fixtures | Fixture sync (challenge) | Yes | Owner/admin |
| POST | /api/brackets/world-cup/[challengeId]/admin/sync-live | Live sync (challenge) | Yes | Owner/admin |

### Legacy compatibility multiplexer

| Method | Path | Purpose | Auth required | Owner/admin required |
|---|---|---|---|---|
| GET/POST/PATCH | /api/brackets/world-cup/[[...path]] | Back-compat multiplexer for older route shapes | Depends on delegated action | Depends on delegated action |

## 7. Environment Checklist

Status legend:
- required
- optional
- local only
- production recommended

| Variable | Status | Notes |
|---|---|---|
| DATABASE_URL | required | Prisma runtime DB URL (pooled) |
| DIRECT_URL | production recommended | Prisma migrate/direct connection |
| NEXTAUTH_SECRET | required | Session/JWT security |
| NEXTAUTH_URL | required | Auth callback and canonical app URL alignment |
| NEXT_PUBLIC_APP_URL | production recommended | Invite URL generation fallback |
| NEXT_PUBLIC_SITE_URL | production recommended | Canonical site origin |
| OPENAI_API_KEY | optional | Enables generative matchup summaries; fallback works without it |
| WORLD_CUP_DATA_PROVIDER | optional | mock, manual, apifootball, sportsdata |
| API_SPORTS_KEY | optional | API-Football ingestion key |
| API_FOOTBALL_KEY | optional | Alias for API-Sports key |
| APISPORTS_FOOTBALL_KEY | optional | Alias for API-Sports key |
| RAPIDAPI_KEY | optional | Alternate alias/key source |
| API_FOOTBALL_WORLD_CUP_LEAGUE_ID | optional | Override competition id |
| API_SPORTS_WORLD_CUP_LEAGUE_ID | optional | Alias competition id override |
| SPORTSDATA_API_KEY | optional | SportsData provider key |
| SPORTSDATA_WORLD_CUP_COMPETITION_ID | optional | SportsData competition id override |
| ADMIN_EMAILS | production recommended | Used in admin access checks |

## 8. Migration Checklist

1. npx prisma validate
2. npx prisma generate
3. npx prisma migrate status
4. npx prisma migrate deploy (production)

Windows Prisma DLL lock fix (if generate fails):

```powershell
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Remove-Item "node_modules\.prisma\client\query_engine-windows.dll.node" -Force -ErrorAction SilentlyContinue
npx prisma generate
```

## 9. Deployment Checklist

1. Confirm migrations are deployed.
2. Confirm required env vars are set for target environment.
3. Confirm app builds successfully.
4. Confirm a World Cup admin can create a challenge.
5. Confirm sync dry-run endpoints work.
6. Confirm invite link generation and join flow works.
7. Confirm AI preview fallback path works without OPENAI_API_KEY.
8. Confirm real provider is either configured correctly or disabled (mock/manual).
9. Confirm no paid prize language/features are enabled unless legal/payment readiness is complete.

## 10. Rollback Plan

1. Disable public discovery:
- Keep challenge visibility private by default.
- If a discovery page is later added, disable route exposure/links and hide from nav.
2. Keep existing leagues read-only:
- Set challenge status to locked/final and enforce lock checks server-side.
3. Turn off AI preview:
- Remove OPENAI_API_KEY or feature-gate the matchup-preview route to deterministic-only path.
4. External provider failure fallback:
- Set WORLD_CUP_DATA_PROVIDER=mock or manual.
5. Recalculate after restore:
- Run POST /api/brackets/world-cup/[challengeId]/recalculate.
6. Inspect integrity:
- Run GET /api/brackets/world-cup/[challengeId]/admin/integrity and resolve reported errors/warnings.

## 11. Known Issue Tracker

1. Official FIFA 2026 best-third slot mapping not finalized in resolver mapping.
2. Official team/fixture import endpoint verification still pending final provider contract.
3. SportsData real endpoint mapping remains scaffold-only until subscription/path validation.
4. Scheduled live sync/cron orchestration still needs production job wiring.
5. Paid prize/legal compliance must be completed before enabling paid pools.
6. Unrelated repo TypeScript errors still exist in non-World-Cup paths (zombie, NCAA/playoff legacy, auth/AI and other modules).

## 12. Route Smoke Helper (Doc-only)

Use these examples for operator smoke checks:

```bash
# Integrity report
curl -X GET /api/brackets/world-cup/{challengeId}/admin/integrity

# Teams sync dry-run (site admin)
curl -X POST /api/brackets/world-cup/admin/sync-teams \
  -H "Content-Type: application/json" \
  -d '{"provider":"apifootball","dryRun":true}'

# Fixtures sync dry-run (owner/admin)
curl -X POST /api/brackets/world-cup/{challengeId}/admin/sync-fixtures \
  -H "Content-Type: application/json" \
  -d '{"provider":"apifootball","dryRun":true}'

# Live sync dry-run (owner/admin)
curl -X POST /api/brackets/world-cup/{challengeId}/admin/sync-live \
  -H "Content-Type: application/json" \
  -d '{"provider":"apifootball","dryRun":true,"recalculate":true}'

# AI matchup preview
curl -X POST /api/brackets/world-cup/{challengeId}/ai/matchup-preview \
  -H "Content-Type: application/json" \
  -d '{"matchId":"{matchId}","strategy":"balanced"}'
```

## 13. Final World Cup Type Safety Gate

Run targeted scan:

```powershell
npx tsc --noEmit 2>&1 | Select-String -Pattern "world-cup|WorldCup|worldCup" | Select-Object -First 100
```

Expected outcome:
- No World Cup-matching errors in output.
- Non-zero exit is possible if unrelated non-World-Cup errors remain.
