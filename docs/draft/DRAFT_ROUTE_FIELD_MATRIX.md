# Draft Route Field Matrix (DB Contract Audit)

Scope: draft base DB contract only. No runtime edits.

Legend:
- ✅ canonical
- ⚠️ mixed
- ❌ legacy/high risk

## Route/Service Matrix

| Route/service path | Reads | Writes | Canonical or legacy | Risk level | Notes/fixes needed |
|---|---|---|---|---|---|
| `app/api/leagues/[leagueId]/draft/session/route.ts` | `DraftSession` snapshot via `buildSessionSnapshot`; draft UI settings; orphan roster data | `DraftSession` indirectly via `getOrCreateDraftSession` and `startDraftSession` service calls | ✅ canonical | Medium | Canonical session endpoint; keep as primary draft state surface. |
| `app/api/leagues/[leagueId]/draft/pool/route.ts` | `DraftPoolCache`, league roster template, resolved DB-backed pool via resolver | `DraftPoolCache` upsert | ⚠️ mixed | Medium | Runtime guard around `prisma.draftPoolCache` indicates Prisma client/schema generation drift risk. |
| `app/api/leagues/[leagueId]/draft/settings/route.ts` | `League`, `LeagueSettings`, `DraftSession`, variant settings/read helpers | `DraftSession` (slot order and manager settings in patch flows), settings-related writes via hubs | ⚠️ mixed | Medium | Structural lock exists for in-progress drafts; still part of active state control surface. |
| `app/api/leagues/[leagueId]/draft/trade-builder/analyze/route.ts` | `DraftSession` (+ picks, slotOrder, tradedPicks) | none | ⚠️ mixed | High | Assumes `currentPick` on session via cast, but `DraftSession.currentPick` is not schema-backed. Migrate to canonical resolver field. |
| `app/api/leagues/[leagueId]/draft/trade-builder/suggestions/route.ts` | `DraftSession` (+ picks, slotOrder, tradedPicks) | none | ⚠️ mixed | High | Same `currentPick` cast drift risk as analyze route; use canonical resolver output instead. |
| `app/api/draft/chat/route.ts` | `DraftSession` for league scoping | `DraftChatMessage` create | ✅ canonical | Medium | Metadata JSON is written via loose cast; add typed validation contract before write. |
| `lib/live-draft-engine/DraftSessionService.ts` | `DraftSession`, `DraftPick`, `League`, `LeagueSettings`, settings/order/timer helpers | `DraftSession`, `DraftPick`, lifecycle and timer state updates | ✅ canonical | Medium | Core canonical state engine; source for read-only DraftState resolver. |
| `lib/draft/execute-pick.ts` | `DraftRoomStateRow`, `DraftRoomPickRecord`, `LeagueTeam`, `MockDraftRoom` | `DraftRoomPickRecord`, `DraftRoomStateRow`, `MockDraftRoom`, chat side effects | ❌ legacy/high risk | High | Active legacy live write path; highest drift risk versus `DraftSession` stack. |
| `lib/draft-room/getResolvedDraftPoolForLeague.ts` | `SportsPlayer`, `SportsPlayerRecord`, ADP/analytics DB sources, league roster template | none | ✅ canonical | Medium | DB-first pool resolver; enriches identity/media/injury/rookie data from DB-backed sources. |
| `app/api/draft/room/state/route.ts` | `DraftRoomStateRow`, `DraftRoomPickRecord`, `League`, `LeagueTeam` | `DraftRoomStateRow` create fallback for `live:{leagueId}` | ❌ legacy/high risk | High | Creates/serves legacy room state, enabling second board authority. |
| `app/api/draft/picks/route.ts` | `DraftSession` (league resolution), league lookup fallback | delegates to `executeDraftPick` legacy writes (`DraftRoomPickRecord` + `DraftRoomStateRow`) | ❌ legacy/high risk | High | Bridge route currently lands in legacy write engine. |
| `app/api/draft/room/start/route.ts` | `MockDraftRoom`, session key parse | `DraftRoomStateRow` update, `MockDraftRoom` update | ❌ legacy/high risk | High | Start path updates legacy state directly. |
| `app/api/draft/pick/undo/route.ts` | `DraftRoomStateRow`, `DraftRoomPickRecord`, `MockDraftRoom`, `League` commissioner check | `DraftRoomPickRecord` delete, `DraftRoomStateRow` update | ❌ legacy/high risk | High | Undo path is fully legacy and mutates alternate state authority. |
| `app/api/draft/queue/update/route.ts` | session key parse + access checks | `DraftRoomUserQueue` upsert | ❌ legacy/high risk | Medium | Queue persistence still tied to legacy session key model. |
| `app/api/draft/mock/cpu-pick/route.ts` | `DraftRoomStateRow`, `DraftRoomPickRecord`, `SportsPlayer` | delegates to `executeDraftPick` legacy writes | ❌ legacy/high risk | High | Mock/live mixed assumptions through legacy model path. |

## Known Schema Drift

1. `DraftSession.currentPick` is assumed in trade-builder routes but not schema-backed.
- Seen in:
  - `app/api/leagues/[leagueId]/draft/trade-builder/analyze/route.ts`
  - `app/api/leagues/[leagueId]/draft/trade-builder/suggestions/route.ts`
- Fix direction: replace casted field usage with canonical resolver-derived `currentPickNumber/currentRound/nextPick`.

2. `draftPoolCache` runtime guard suggests Prisma client/schema generation drift risk.
- Seen in `app/api/leagues/[leagueId]/draft/pool/route.ts`.
- Fix direction: enforce generate/migration pipeline so model presence is guaranteed.

3. Metadata JSON writes need typed validation.
- Seen in `app/api/draft/chat/route.ts` and other metadata-bearing routes.
- Fix direction: add route-level schema validation before Prisma JSON writes.

4. Rookie/image/status fields are not fully centralized.
- Resolver-level merge logic currently composes identity/media/status across multiple sources in `lib/draft-room/getResolvedDraftPoolForLeague.ts`.
- Fix direction: move toward one canonical read contract for player draft-card identity/media/status.

## High-Risk Routes/Services To Prioritize

- `lib/draft/execute-pick.ts`
- `app/api/draft/room/state/route.ts`
- `app/api/draft/picks/route.ts`
- `app/api/draft/room/start/route.ts`
- `app/api/draft/pick/undo/route.ts`
- `app/api/leagues/[leagueId]/draft/trade-builder/analyze/route.ts`
- `app/api/leagues/[leagueId]/draft/trade-builder/suggestions/route.ts`

## Path Clarification

A requested path appears to be outdated in current code layout:
- Requested: `lib/draft/DraftSessionService.ts`
- Actual canonical service path: `lib/live-draft-engine/DraftSessionService.ts`
