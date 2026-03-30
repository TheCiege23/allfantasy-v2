# PROMPT 172 — Unified Draft Room Implementation Spec

## Objective

Implement a premium, high-density, cross-sport live + mock draft experience for AllFantasy with:

- unified visual quality across live and mock draft rooms
- manager-color identity and board tinting
- user-specific AI suggestions surfaced in draft chat
- ADP AI integrated directly into the player board workflow
- consistent back navigation in draft rooms
- full support for all required sports

No code is included in this prompt; this is the execution spec.

---

## Binding Product and Scope Requirements

### Required Sports (non-negotiable)

Support all of:

- NFL
- NHL
- NBA
- MLB
- NCAA Basketball (`NCAAB`)
- NCAA Football (`NCAAF`)
- Soccer (`SOCCER`)

Use `lib/sport-scope.ts` (`SUPPORTED_SPORTS`, `DEFAULT_SPORT`, `isSupportedSport`, `normalizeToSupportedSport`) as single source of truth.

### Visual Direction

- Use the provided draft-room reference image as workflow inspiration only.
- Do not copy brand assets, exact UI text, exact icon sets, or proprietary visuals.
- Recreate workflow patterns in AllFantasy style.
- Build sport-specific variants from one shared design system.

### Mandatory Feature Adds

1. Use adapted image assets for live and mock drafts across all sports.
2. Add/standardize back button in draft rooms.
3. Manager names use distinct colors.
4. Draft board picks include manager-linked tint/hue.
5. AI suggestions for current user are injected into chat context.
6. ADP AI is available directly on player board/list workflow.

---

## Repository-Level Implementation Plan

## Phase 1 — Data Contracts and Sport Coverage

### 1.1 Expand mock-draft sport types to all seven sports

Update:

- `lib/mock-draft/types.ts`
- `components/mock-draft/MockDraftSetup.tsx`

Requirements:

- `MockDraftSport` includes all seven sports.
- Setup sport selector shows all seven sports.
- Default/fallback sport resolves through `normalizeToSupportedSport`.
- No hardcoded 3-sport list remains.

### 1.2 Ensure pool + ADP pipelines are sport-safe

Validate and normalize in:

- `app/api/mock-draft/adp/route.ts`
- `lib/mock-draft/sport-player-pool.ts`
- `components/MockDraftSimulatorClient.tsx`
- `components/app/draft-room/PlayerPanel.tsx`

Requirements:

- Non-NFL sports return meaningful player pool data.
- ADP AI UX degrades gracefully if low sample / unavailable.
- AI ADP toggle state remains functional across sports.

---

## Phase 2 — Unified Visual Shell for Live + Mock

### 2.1 Introduce shared draft visual tokens/components

Create shared primitives under:

- `components/app/draft-room/` (shared shell styles)
- `components/mock-draft/` (consume same visual primitives where possible)

Requirements:

- Shared density profile (compact rows, high info throughput).
- Mobile and desktop parity.
- No regression in existing event handlers and `data-testid`s.

### 2.2 Adapt image direction for all sports

Targets:

- Live room board/header visual surfaces
- Mock simulator board/header visual surfaces

Requirements:

- Derive AllFantasy-owned variants from provided reference.
- Sport-specific theming and labels.
- Avoid one-to-one visual duplication.

---

## Phase 3 — Back Navigation Standardization

### 3.1 Live draft back action

Validate and standardize in:

- `components/app/draft-room/DraftTopBar.tsx`
- `components/app/draft-room/DraftRoomPageClient.tsx`

Requirements:

- Back button always visible in live draft room header.
- Routes back to league context deterministically.
- Preserve current `data-testid="draft-back-button"`.

### 3.2 Mock draft back action

Add explicit back affordance in:

- `components/mock-draft/MockDraftSimulatorWrapper.tsx`
- `components/MockDraftSimulatorClient.tsx`

Requirements:

- Back to lobby/setup path is available from active draft screen.
- Back from recap remains available.
- Mobile and desktop both covered.

---

## Phase 4 — Manager Color Identity and Board Tinting

### 4.1 Manager color map as shared utility

Create centralized resolver:

- `lib/draft-room/ManagerColorResolver.ts` (new)

Responsibilities:

- deterministic color by manager/roster slot
- text color + badge color + board tint color
- contrast-safe palette

### 4.2 Apply manager colors to names and picks

Update:

- `components/app/draft-room/DraftManagerStrip.tsx`
- `components/app/draft-room/DraftBoardCell.tsx`
- `components/app/draft-room/DraftBoard.tsx`
- `components/MockDraftSimulatorClient.tsx` (manager labels + pick cards)

Requirements:

- Manager display names are visibly color-distinct.
- Board cells/pick cards receive subtle hue tint tied to manager color.
- Current-on-clock highlighting remains stronger than manager tint.

---

## Phase 5 — AI Suggestions in Chat (User-Specific)

### 5.1 Live draft chat AI suggestion cards

Update:

- `components/app/draft-room/DraftChatPanel.tsx`
- `components/app/draft-room/DraftRoomPageClient.tsx`
- `app/api/leagues/[leagueId]/draft/chat/route.ts`

Requirements:

- When user is on clock (or near pick), show AI suggestion entry in chat stream.
- Tie suggestion to current user roster/pick context.
- Include quick action: apply to queue and/or open in helper.

### 5.2 Mock draft chat AI suggestion cards

Update:

- `components/mock-draft/MockDraftChatPanel.tsx`
- `components/mock-draft/MockDraftSimulatorWrapper.tsx`
- `app/api/mock-draft/[draftId]/chat/route.ts`

Requirements:

- Same user-specific suggestion behavior in mock flow.
- Respect draft state (pre-draft/in-progress/completed).

---

## Phase 6 — ADP AI on Player Board

### 6.1 Live room player panel

Update:

- `components/app/draft-room/PlayerPanel.tsx`
- `components/app/draft-room/DraftPlayerCard.tsx`
- `components/app/draft-room/DraftRoomPageClient.tsx`

Requirements:

- ADP AI values visible inline on player rows/cards.
- Toggle between baseline ADP and AI ADP persists in-room.
- Low-sample and unavailable states clearly labeled.

### 6.2 Mock simulator board/player listings

Update:

- `components/MockDraftSimulatorClient.tsx`
- `app/api/mock-draft/adp/route.ts`

Requirements:

- ADP AI layer displayed in mock board selection flow.
- Same fallback behavior as live room.

---

## Phase 7 — Hardening and Consistency

### 7.1 Security and authority fix

Fix:

- `lib/live-draft-engine/auth.ts`

Requirement:

- `canSubmitPickForRoster` must verify roster ownership for non-commissioners.

### 7.2 Realtime/state desync safeguards

Review and tighten:

- `components/app/draft-room/DraftRoomPageClient.tsx`
- `app/api/leagues/[leagueId]/draft/events/route.ts`
- `app/api/leagues/[leagueId]/draft/session/route.ts`

Requirements:

- preserve version-aware state application
- avoid stale poll overwrites
- keep refresh behavior robust on tab visibility changes

---

## Mandatory Click Audit (Required Before Merge)

Audit every draft-related:

- page
- tab
- modal
- button
- card
- list row
- toggle
- dropdown
- chat input/send
- queue action
- pick action

For each interaction verify:

1. component exists
2. handler exists
3. backend/API wiring exists
4. realtime/poll refresh exists
5. persisted state reload is correct
6. route transition is correct
7. no dead/stale control

Minimum routes to audit:

- `/app/league/[leagueId]/draft`
- `/app/league/[leagueId]` (Draft tab)
- `/mock-draft`
- `/mock-draft-simulator`
- `/mock-draft/share/[shareId]`
- `/mock-draft/join`
- draft results routes

---

## QA and Test Plan

### Add/Update E2E

- extend `e2e/draft-room-click-audit.spec.ts`:
  - back button assertion
  - manager color + board tint assertions
  - AI suggestion in chat assertions
  - ADP AI board mode assertions
  - mobile + desktop parity
- add new mock flow audit spec:
  - `e2e/mock-draft-room-click-audit.spec.ts` (new)
  - cover setup, start, chat AI suggestion, back button, ADP AI visibility
- run across `chromium`, `firefox`, `webkit`

### Add/Update Unit/Contract Tests

- `__tests__/mock-draft-*` for sport enum expansion
- auth test for roster ownership enforcement
- ADP AI fallback tests for non-NFL + low-sample states

---

## Definition of Done

Done means all are true:

- all seven sports supported in live + mock draft flows
- shared premium visual shell in place (without copied proprietary assets)
- manager color/tint system active in both live and mock board views
- back button present and functional in draft rooms
- AI suggestion appears in chat for current user context
- ADP AI integrated into player board workflow
- no dead draft controls found in click audit
- new/updated tests pass across three browsers
- no regressions in existing draft-room E2E (`@draft-room`)

---

## Recommended Execution Order

1. Sport/type contract updates
2. Shared visual primitives + image adaptation
3. Back button standardization
4. Manager color + tint integration
5. AI-in-chat integration
6. ADP AI board integration
7. Auth/realtime hardening
8. Full click audit + cross-browser test pass

