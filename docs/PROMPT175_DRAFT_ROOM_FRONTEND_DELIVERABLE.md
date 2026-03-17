# PROMPT 175 — Draft Room Frontend Core UI Deliverable

## Route updates

| Route | Type | Purpose |
|-------|------|---------|
| `/app/league/[leagueId]/draft` | [NEW] | Canonical live draft room: top status, manager strip, draft board, player panel, queue panel, chat panel. Server page fetches league (name, sport), checks commissioner; client fetches session + queue and wires all controls. |

**Existing routes used (no changes):**

- `GET/POST /api/leagues/[leagueId]/draft/session` — load/create/start session
- `GET/PUT /api/leagues/[leagueId]/draft/queue` — get/save queue
- `POST /api/leagues/[leagueId]/draft/pick` — submit pick
- `POST /api/leagues/[leagueId]/draft/controls` — commissioner: pause, resume, reset_timer, undo_pick
- `GET /api/app/league/[leagueId]/draft` — player pool (proxies to mock-draft ADP)

**Entry from league hub:** Draft tab now includes an “Open draft room” link to `/app/league/[leagueId]/draft`.

---

## Component tree summary

```
app/app/league/[leagueId]/draft/page.tsx (server)
└── DraftRoomPageClient
    └── DraftRoomShell
        ├── topBar     → DraftTopBar
        ├── managerStrip → DraftManagerStrip
        ├── draftBoard → DraftBoard
        │   └── DraftBoardCell (per pick cell)
        ├── playerPanel → PlayerPanel
        ├── queuePanel → QueuePanel
        └── chatPanel  → DraftChatPanel
```

- **DraftTopBar:** League name, sport, draft type, current manager on clock, pick label, overall pick #, timer (running/paused/expired/none), commissioner controls (Commissioner, Pause, Resume, Reset timer, Undo), reconnect state.
- **DraftManagerStrip:** Draft order strip; manager cards with slot, displayName; color assignment; active (on-the-clock) highlight; traded-pick metadata support (tint, new owner in red when enabled).
- **DraftBoard:** Grid by round × slot; uses live-draft-engine `DraftOrderService` (formatPickLabel, getSlotInRoundForOverall) and session picks + slotOrder; supports traded-pick color mode and “new owner in red”.
- **DraftBoardCell:** Pick label, owner displayName, drafted player (name, position, team, bye), traded-pick new owner in red when configured, empty state “—”.
- **PlayerPanel:** Search, position filter (sport-aware via `getPositionFilterOptionsForSport`), team filter, ADP/Name sort, optional AI ADP toggle, “My roster” view, add-to-queue and Draft (when on clock) actions.
- **QueuePanel:** Queue list, drag/drop reorder (saves via PUT queue), AI reorder entry, auto-pick from queue checkbox, away mode checkbox, Draft-from-queue when on clock.
- **DraftChatPanel:** Message list, composer, league-sync badge entry, commissioner broadcast entry, refresh/reconnect button.
- **DraftRoomShell:** Desktop: top bar + strip + board (flex-2) + three-column (players | queue | chat). Mobile: tabbed (Board | Players | Queue | Chat) with bottom nav.

---

## File manifest ([NEW] / [UPDATED])

| Label | Relative path |
|-------|----------------|
| [NEW] | `app/app/league/[leagueId]/draft/page.tsx` |
| [NEW] | `components/app/draft-room/DraftTopBar.tsx` |
| [NEW] | `components/app/draft-room/DraftManagerStrip.tsx` |
| [NEW] | `components/app/draft-room/DraftBoard.tsx` |
| [NEW] | `components/app/draft-room/DraftBoardCell.tsx` |
| [NEW] | `components/app/draft-room/PlayerPanel.tsx` |
| [NEW] | `components/app/draft-room/QueuePanel.tsx` |
| [NEW] | `components/app/draft-room/DraftChatPanel.tsx` |
| [NEW] | `components/app/draft-room/DraftRoomShell.tsx` |
| [NEW] | `components/app/draft-room/DraftRoomPageClient.tsx` |
| [NEW] | `components/app/draft-room/index.ts` |
| [UPDATED] | `components/app/tabs/DraftTab.tsx` (added “Open draft room” link) |

---

## Mandatory click audit (summary)

- **Top status:** Manager on clock, timer, pick #, draft type/sport visible; commissioner buttons (Pause, Resume, Reset timer, Undo) call `POST .../draft/controls` and update session; disabled when loading; reconnect state shown.
- **Manager strip:** Order and manager cards render from slotOrder; active roster highlighted; traded-pick visuals when options enabled.
- **Draft board:** Round/pick (e.g. 1.01), drafted player cards, empty/drafted states; traded-pick ownership and optional new owner in red; bye week shown.
- **Player panel:** Search and position/team filters update filtered list; ADP/Name sort toggles; Add to queue and Draft (when on clock) wired; “My roster” view toggles; player pool from `useLeagueSectionData(leagueId, 'draft')`.
- **Queue panel:** Remove and reorder (drag/drop) persist via PUT queue; auto-pick and away mode checkboxes; Draft from queue (first item) when on clock.
- **Chat panel:** Composer and send (entry point; backend chat TBD); commissioner broadcast entry; refresh/reconnect.
- **Mobile:** Tab bar switches Board / Players / Queue / Chat; all panels accessible; touch-friendly targets.
- **Desktop:** Grid layout; all panels visible; no dead controls.

---

## Mobile QA checklist

- [ ] Top bar: league name, timer, pick #, manager on clock readable; commissioner buttons (if applicable) tappable and show loading/disabled when needed.
- [ ] Manager strip: scrolls horizontally if needed; active manager clearly highlighted; tap targets adequate.
- [ ] Draft board: scrolls; cells show pick label and player/empty; no clipped content.
- [ ] Player panel: search and filters work; sort toggles work; Add to queue and Draft buttons tappable; “My roster” toggle works.
- [ ] Queue panel: drag/drop or reorder works; remove works; auto-pick and away mode toggles work; Draft from queue works when on clock.
- [ ] Chat panel: input focus and send work; refresh/reconnect works.
- [ ] Bottom nav: Board, Players, Queue, Chat switch content; active tab indicated.
- [ ] Reconnect/refresh: polling or manual refresh updates session/queue; no duplicate submissions.

---

## Desktop QA checklist

- [ ] Top bar: all elements visible; commissioner controls (Pause, Resume, Reset timer, Undo) wired and disabled when unavailable or loading.
- [ ] Manager strip: full order visible; active highlight; traded-pick options apply.
- [ ] Draft board: full grid visible; round/pick and drafted players; traded-pick color/new owner in red when enabled.
- [ ] Player panel: search, position, team filters; ADP/Name sort; AI ADP toggle if present; add to queue and Draft wired; roster view toggles.
- [ ] Queue panel: drag/drop reorder persists; AI reorder entry; auto-pick and away mode; draft from queue when on clock.
- [ ] Chat panel: open during draft; league-sync badge and commissioner broadcast entry; send and refresh work.
- [ ] No dead buttons/tabs/dropdowns: every control has click handler and state/API wiring where applicable.
- [ ] Disabled states: commissioner actions disabled when loading; draft actions disabled when not on clock or submitting.
