## Draft / League / Player Audit

### Existing draft-related pieces

- **League core (`prisma/schema.prisma`, `League`)**
  - Generic league model with `sport`, `leagueSize`, `rosterSize`, `starters` (Json), etc.
  - No explicit draft state model tied to `League` (no `Draft`, `DraftPick`, or `DraftRoom` models yet).

- **Mock draft & war room (legacy + tools)**
  - `MockDraft` model:
    - `id`, `leagueId`, `userId`, `rounds`, `results` (Json), etc.
    - Used for AI/mock simulations, not a live league draft.
  - AF Legacy mock draft UI:
    - `app/af-legacy/components/mock-draft/DraftRoom.tsx`:
      - Very rich legacy draft room for *mock* drafts:
        - Supports snake/linear/auction-like configuration (`draftFormat` prop).
        - Timer controls (`secondsPerPick`, `draftStartedAt`, `timerNow`).
        - Draft board, available players, pick list, AI helpers, trade tools, etc.
      - Not wired to the new `League` model or a persistent draft state for the live app.
  - Mock draft APIs under `app/api/mock-draft/...` (ADP, simulate, AI pick, trade optimizer, etc.), used for simulations and AI analysis, not for a live, league-attached draft.

- **Draft tab in the new League app**
  - `components/app/tabs/DraftTab.tsx`:
    - Uses `useLeagueSectionData(leagueId, 'draft')` → `/api/app/league/[leagueId]/draft`, which proxies to a legacy draft-war-room endpoint.
    - Renders:
      - `SmartDataView` for draft AI output.
      - `DraftQueue` + `useDraftQueue` (in `components/app/draft`) for a **local draft queue**, but this is client-only state (no persistent queue model).
      - `LegacyAIPanel` pointing at `draft-war-room`.
    - There is **no live draft board**, timer, or pick engine connected to `League`.

- **Roster & players**
  - `Roster` (new app):
    - `leagueId`, `platformUserId`, `playerData` (Json), `faabRemaining`, `waiverPriority`.
    - Player data is an array of IDs or objects; used across trade/waiver tools.
  - `SportsPlayer`:
    - `id`, `sport`, `externalId`, `name`, `position`, `team`, etc. – multi-sport player pool.
  - These can be reused for draft player pools, independent of sport.

- **User/session**
  - NextAuth-based session (`authOptions`).
  - `app/api/league/list`, `app/api/league/roster` already use `session.user.id` to scope leagues/rosters for the current user.
  - This can be reused for determining the active drafter and commissioner (league owner).

### Gaps for a live draft room

- No persistent draft state per league:
  - Missing models:
    - **Draft**: type (snake/linear/auction), timer length, draft order, paused/autopick flags.
    - **DraftPick**: current and historical picks.
    - **DraftQueueItem**: per-roster draft queue.
  - Missing integration with `League` (no `leagueId` → draft state link).

- No backend draft engine for:
  - Current pick tracking (overall, round, slot).
  - Timer handling and autopick.
  - Undo/reset/assign pick operations.
  - Commissioner controls.

- No live draft room for the new app:
  - `DraftTab` is AI + queue only; there’s no actual draft board or timer-driven pick flow.
  - No polling or websocket endpoints for draft state updates tied to `League`.

### Preservation / reuse decisions

- **Reuse:**
  - `League`, `Roster`, `SportsPlayer` as the foundation for draft leagues, teams, and player pool.
  - Existing `DraftQueue` + `useDraftQueue` UX patterns as inspiration for the new queue UI (but backed by new `DraftQueueItem` model).
  - Legacy `app/af-legacy/components/mock-draft/DraftRoom.tsx` as a UX reference for:
    - Board layout, timer block, and “on the clock” display.
    - Multi-sport friendly labeling and position colors.
  - Existing AI draft endpoints & `DraftTab` AI panel to continue surfacing recommendations alongside the new live room.

- **New:**
  - `LeagueDraft` (or `Draft`) model linked to `League` to store:
    - `draftType`, `timerSeconds`, `order`, `paused`, `autopickMode`, `currentPickIndex`, `currentRound`, etc.
  - `DraftPick` and `DraftQueueItem` models.
  - `lib/draft-room` engine:
    - Core state transitions: make pick, undo, reset, assign, pause/resume, advance pick.
  - `app/api/draft-room/leagues/[leagueId]/...` namespace:
    - `GET state`, `POST pick`, `POST commissioner actions`, and potentially a simple event stream/polling-based mechanism for realtime.
  - `components/draft/LiveDraftRoom.tsx`:
    - New live draft room shell (board, current pick panel, timer, queue, available players, recent picks, chat placeholder).
    - Connected to the engine APIs via polling (websocket ready design).

