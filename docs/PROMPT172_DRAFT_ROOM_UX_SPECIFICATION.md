# PROMPT 172 — AllFantasy Draft Room UX Specification

## Objective

Define a premium live draft room and mock draft room UX that delivers modern, dense, highly usable draft workflows with AllFantasy AI and chat enhancements.

Constraints:
- Do not use another platform's brand names, assets, copy, or proprietary styling.
- Keep a familiar fantasy draft workflow while preserving AllFantasy identity.
- No implementation code in this document.

## Supported Sports

- NFL
- NHL
- NBA
- MLB
- NCAA Basketball (`NCAAB`)
- NCAA Football (`NCAAF`)
- Soccer (`SOCCER`)

Use `lib/sport-scope.ts` as the single source of truth for sport validation and fallbacks.

---

## Required Draft Room Layout

### Top Bar

Required content:
- league name
- draft type
- sport
- timer status
- current pick indicator
- current manager on the clock
- commissioner controls (when authorized)

Behavior requirements:
- fixed and always visible in active draft states
- deterministic back navigation available in live and mock rooms
- reconnect/resync control visible when state freshness degrades

### Manager Strip / Team Order Row

Required behavior:
- show all managers in exact draft order
- assign deterministic manager color identity
- highlight active manager
- support traded-pick color mode
- traded pick tiles may inherit acquiring manager hue only when setting is enabled
- no pick-color transfer on non-traded picks
- clear manager card styling on mobile and desktop

### Draft Board

Required behavior:
- pick labels in `1.01`, `1.02`, etc.
- drafted player shown per pick cell
- bye week shown where applicable
- traded-pick owner shown
- optional traded-pick tile tint by acquiring manager color
- optional "new owner name in red" display mode
- no color transfer when traded-pick color mode is disabled

### Player Panel

Required behavior:
- available players
- ADP sorting
- name sorting
- team filter
- position filter
- search by player and team
- bye week where appropriate
- AI-adjusted ADP toggle
- current drafted roster view

### Queue Panel

Required behavior:
- personal queue
- drag/reorder queue
- AI reorder queue toggle
- auto-pick from queue
- away mode
- AI explanations for queue ordering

### Chat Panel

Required behavior:
- always visible during active live draft
- league-scoped in live drafts
- live-only league chat sync when enabled
- mock chat remains isolated
- supports GIFs, links, images, short videos, memes
- supports `@mentions`
- supports commissioner `@everyone` broadcast to selected managed leagues
- supports AI handoff into private AI chat
- supports last-active/last-seen where policy allows

### AI Panels / Actions

Required modules:
- draft helper
- best pick
- positional need
- roster construction advice
- reach/steal warning
- pick trade evaluation
- orphan team AI manager
- AI queue optimization
- AI mock draft simulation mode

### Settings / Toggles

Required toggles:
- traded pick color mode
- show new owner name in red
- AI ADP on/off
- AI queue reorder on/off
- orphan team AI manager on/off
- draft chat <-> league chat live sync on/off
- auto-pick behavior
- timer mode
- overnight pause / soft timer options (where architecture supports)

---

## Route Map

| Route | Purpose |
|---|---|
| `/app/league/[leagueId]/draft` | Canonical live draft room |
| `/app/league/[leagueId]` | League entry point (Draft tab -> open room) |
| `/mock-draft` | Mock lobby + setup + saved mocks |
| `/mock-draft-simulator` | Active simulator workspace path |
| `/mock-draft/join` | Invite/join flow |
| `/mock-draft/share/[shareId]` | Shareable recap/read-only view |

---

## Screen Inventory

- **Live Draft Room:** top bar, manager strip, board, player panel, queue panel, chat panel, AI helper, commissioner controls.
- **Live Draft Settings Modal:** all draft/AI/chat/presentation toggles.
- **Mock Lobby/Setup:** sport/type/teams/rounds/timer/AI options and saved drafts.
- **Mock Active Room:** simulator board, isolated chat, AI actions, session controls.
- **Mock Recap/Share:** results review, share link, restart/back navigation.

---

## Component Inventory

- **Shell and layout:** `DraftRoomShell`, `DraftTopBar`, `DraftManagerStrip`
- **Board:** `DraftBoard`, `DraftBoardCell`, round navigation controls
- **Players:** `PlayerPanel`, filter/sort/search controls, roster summary
- **Queue:** `QueuePanel`, reorder controls, AI reorder action, autopick controls
- **Chat:** `DraftChatPanel`, composer, mention handling, broadcast controls
- **AI:** `DraftHelperPanel`, recommendation cards, queue optimization, trade evaluation
- **Commissioner:** control center/modal, pause/resume/reset/undo/toggles
- **Mock flow:** `MockDraftSetup`, `MockDraftSimulatorWrapper`, `MockDraftChatPanel`, `MockDraftRecap`

---

## State Matrix

| Domain | Core states |
|---|---|
| Draft lifecycle | `pre_draft`, `in_progress`, `paused`, `completed` |
| Draft type | `snake`, `linear`, `auction` |
| Turn context | self on-clock, other on-clock, orphan on-clock |
| Timer | running, paused, expired, none |
| Connectivity | healthy, reconnecting, resyncing, stale |
| Board ownership | original owner, traded owner, optional red owner text |
| AI ADP | off, on, unavailable, low sample warning |
| Queue | empty, populated, reordered, autopick enabled |
| Chat mode | live league-synced, live isolated, mock isolated |
| Device layout | mobile tabs/sticky sections, desktop multi-pane |

---

## Interaction Matrix (Mandatory Click Audit)

For every interaction in live and mock draft rooms, define and validate:
- route
- component
- CTA
- expected state change
- backend dependency
- realtime dependency
- empty state
- loading state
- error state
- mobile behavior
- desktop behavior

### Required Interaction Categories

- **Navigation:** open room, back actions, tab changes, round navigation
- **Draft controls:** pause/resume/reset/undo/start/resync
- **Board actions:** pick visibility, traded ownership, tint mode behavior
- **Player actions:** filters, search, sorts, queue add, pick submit, AI ADP toggle
- **Queue actions:** reorder, AI reorder, autopick/away mode
- **Chat actions:** send text/media, mention, broadcast, AI handoff
- **AI actions:** refresh helper, best pick use, trade eval, queue optimization
- **Settings actions:** all toggle persist/reload behavior

### Audit Output Schema (per interaction)

| Field | Required value |
|---|---|
| Route | concrete route path |
| Component | concrete component name |
| CTA | exact action label/button |
| Expected state change | deterministic before -> after |
| Backend dependency | API/service endpoint or "none" |
| Realtime dependency | websocket/polling/refresh or "none" |
| Empty state | expected UX copy + affordance |
| Loading state | expected spinner/skeleton/disabled behavior |
| Error state | expected message + recovery CTA |
| Mobile behavior | layout + interaction rule |
| Desktop behavior | layout + interaction rule |

---

## Recommended Visual Hierarchy

1. **First priority:** timer, current pick, on-clock manager in top bar.
2. **Second priority:** draft board as dominant workspace.
3. **Third priority:** manager strip identity and active highlight context.
4. **Fourth priority:** player panel + queue panel for action throughput.
5. **Fifth priority:** chat + AI assistant as contextual accelerators.
6. **Sixth priority:** commissioner controls and settings grouped, not intrusive.

Design language:
- compact, dense information architecture
- high legibility and strong contrast
- restrained accent color system
- predictable visual semantics for warnings/errors/destructive actions

---

## Recommended Mobile Behavior

- sticky top bar and current-pick context
- horizontal manager strip with clear active state
- tabbed section switching (`Board`, `Players`, `Queue`, `AI`, `Chat`)
- full-width, thumb-friendly action controls
- bottom sheets for settings and commissioner controls
- preserve all interaction affordances and `data-testid` hooks

---

## Recommended Desktop Behavior

- persistent top bar and manager strip
- board-first layout with dense multi-pane lower workspace
- player, queue, chat, and AI panels visible without deep navigation
- inline commissioner controls for fast intervention
- predictable resize behavior and no hidden critical CTAs

---

## Definition of UX Completion

The UX specification is considered complete when:
- all required routes, screens, components, and states are defined
- all required interactions are mapped with dependency and behavior rules
- mobile and desktop behavior guidance is explicit
- all seven supported sports are covered consistently
- no external platform branding/copy/assets are used

