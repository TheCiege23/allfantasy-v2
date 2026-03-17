# PROMPT 174 — Mock Draft Engine Deliverable

## Overview

The AllFantasy mock draft engine supports **solo mocks**, **public/linked mocks**, **CPU managers**, **mixed human+CPU mocks**, and **AI-assisted draft experimentation**. Mock chat is **isolated** (no league-chat sync).

**Supported sports:** NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer.

---

## Backend

### Models (Prisma)

- **MockDraft**
  - `status`: `pre_draft` | `in_progress` | `completed` (default `pre_draft`)
  - `inviteToken`: unique token for join link
  - `slotConfig`: JSON array of `{ slot, type: 'human'|'cpu', displayName }`
  - `results`: JSON array (default `[]`)
  - Other existing fields: `userId`, `leagueId`, `rounds`, `metadata`, `shareId`, etc.

- **MockDraftChat**
  - `mockDraftId`, `userId`, `displayName`, `content`, `createdAt`
  - Relation: `MockDraft.chatMessages` — mock-only chat, not synced to league chat.

### Services (`lib/mock-draft-engine/`)

| Service | Functions |
|--------|-----------|
| **MockDraftSessionService** | `createMockDraftSession`, `getMockDraftById`, `getMockDraftByInviteToken`, `startMockDraft`, `resetMockDraft`, `completeMockDraft`, `joinMockDraftByToken` |
| **MockSettingsService** | `getMockDraftSettings`, `updateMockDraftSettings` (only when `pre_draft`) |
| **types** | `MockDraftStatus`, `MockSlotType`, `MockSlotConfigEntry`, `MockDraftSettings`, `MockDraftSessionSnapshot` |

### API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/mock-draft/create` | Create mock; with `useSession: true` or `slotConfig` returns `draftId`, `inviteToken`, `inviteLink`, `slotConfig`, `status`. |
| GET | `/api/mock-draft/[draftId]` | Session snapshot for room/reconnect. |
| GET / PATCH | `/api/mock-draft/[draftId]/settings` | Read/update settings (PATCH only when `pre_draft`). |
| POST | `/api/mock-draft/[draftId]/start` | Set status to `in_progress` (owner only). |
| POST | `/api/mock-draft/[draftId]/reset` | Clear results, set status to `pre_draft` (owner only). |
| GET | `/api/mock-draft/join?token=` | Get draft snapshot by invite token. |
| POST | `/api/mock-draft/join` | Body `token` (optional `displayName`); join and claim first empty human slot. |
| GET / POST | `/api/mock-draft/[draftId]/chat` | List messages / send message (mock-only, no league chat). |

Existing routes still used: `/api/mock-draft/save`, `/api/mock-draft/simulate`, `/api/mock-draft/share`, etc.

---

## Frontend

### UI Screens / Pages

- **`/mock-draft`** — Lobby: recent mocks, “New mock draft”, main area shows setup or simulator + session toolbar when applicable. Reads `?draftId=` and loads session for invite/start/reset/chat.
- **`/mock-draft/join?token=`** — Join flow: GET draft by token, show preview, “Join mock draft” → POST join → redirect to `/mock-draft?draftId=...`.
- **`/mock-draft/share/[shareId]`** — Existing share recap page.

### Components

- **MockDraftSetup** — Sport, league type, draft type, teams, scoring, timer, rounds, player pool (all/vets/rookies), roster size, AI assistant toggle. On Start → create session (if using session flow) and go to room.
- **MockDraftSimulatorWrapper** — Creates session when user completes setup with `useSession: true`; shows **MockDraftInviteLink**, **Start draft**, **Reset**, **MockDraftChatPanel**, and **MockDraftSimulatorClient** (with `initialDraftId` when session exists). Accepts `initialSessionDraft` when opening via `?draftId=`.
- **MockDraftInviteLink** — Shows invite link when status is `pre_draft`; copy-to-clipboard button.
- **MockDraftChatPanel** — GET/POST `/api/mock-draft/[draftId]/chat`; message list + input; polling for new messages. Mock-only; no league chat.
- **MockDraftRecap** — Draft replay/summary (existing).
- **MockDraftSimulatorClient** — Existing simulator; now accepts `initialDraftId` so saves attach to session draft.

### Features

- **Create unlimited mocks** — Architecture allows many MockDraft rows per user.
- **Configurable** — Teams, timer, roster size, pool (all/vets/rookies) in setup and settings API.
- **Real / CPU / mixed** — `slotConfig` (human vs CPU per slot); default slot 1 human, rest CPU.
- **Copy/share mock link** — Invite link uses `inviteToken`; share recap uses existing share flow.
- **Mock-only isolated chat** — `MockDraftChat` and `/api/mock-draft/[draftId]/chat`; no league-chat sync.
- **AI assistant** — Toggle in setup; `showAIAssistantPanel` on client.
- **Draft replay/summary** — MockDraftRecap after completion; results saved to draft (and share when used).
- **No league-chat sync for mock draft chats** — Enforced by separate model and routes.

---

## QA Checklist (Mandatory Click Audit)

- [ ] **Create mock works** — New mock draft from lobby → Setup → Start → session created; room shows with invite link and Start/Reset when applicable.
- [ ] **Edit mock settings works** — When status is `pre_draft`, PATCH `/api/mock-draft/[draftId]/settings` updates and GET returns updated settings; UI controls (if exposed) reflect changes.
- [ ] **Invite/share works** — Copy invite link from room; open in another browser or incognito; join page shows draft preview; Join → redirect to room with `draftId`.
- [ ] **CPU fills empty slots correctly** — With default or custom `slotConfig`, CPU slots are used by simulator/AI (existing DraftAIManager / simulate flow) where applicable.
- [ ] **Mock chat stays mock-only** — Messages in mock room appear only in mock chat; league chat is unchanged; no sync between them.
- [ ] **Start draft works** — In room, “Start draft” calls POST start → status `in_progress`; UI updates; draft can proceed (e.g. simulate run).
- [ ] **Reset/restart works** — “Reset” calls POST reset → status `pre_draft`, results cleared; room can start again.
- [ ] **No dead settings controls** — All visible settings (sport, teams, timer, roster size, pool, etc.) are wired to create/settings and affect behavior; no orphaned or non-functional controls.

---

## File Summary

- **Schema:** `prisma/schema.prisma` (MockDraft, MockDraftChat)
- **Migration:** `prisma/migrations/20260346000000_add_mock_draft_engine/migration.sql`
- **Engine:** `lib/mock-draft-engine/` (types, MockDraftSessionService, MockSettingsService, index)
- **API:** `app/api/mock-draft/create`, `[draftId]/route`, `[draftId]/settings`, `[draftId]/start`, `[draftId]/reset`, `[draftId]/chat`, `join`
- **UI:** `components/mock-draft/MockDraftSetup`, `MockDraftInviteLink`, `MockDraftChatPanel`, `MockDraftSimulatorWrapper`, `MockDraftLobbyPage`, `MockDraftRecap`; `app/mock-draft/page.tsx`, `app/mock-draft/join/page.tsx`
- **Client:** `MockDraftSimulatorClient` (initialDraftId support)
