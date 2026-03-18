# PROMPT 354 — Zombie League Frontend + Universe Standings/Forum Deliverable

**Status:** Frontend implemented. NFL-first; layout and components sport-extensible.

---

## 1. Route updates

| Route | Purpose |
|-------|--------|
| `/app/league/[leagueId]` | League page now detects `leagueVariant === 'zombie'` and sets `isZombie`; Overview tab renders `ZombieHome`. |
| `/app/zombie-universe` | List zombie universes the user can access (from `/api/zombie-universe`). |
| `/app/zombie-universe/[universeId]` | Universe home: Standings and Forum tabs with inline content. |
| `/app/zombie-universe/[universeId]/standings` | Full-page universe standings (searchable, filterable table). |
| `/app/zombie-universe/[universeId]/forum` | Full-page universe forum (pinned updates, discussion threads). |

---

## 2. Component tree summary

```
OverviewTab (app tabs)
└── ZombieHome (when isZombie)
    ├── Header (Zombie branding)
    ├── Quick links (Chat, Settings, AI, Waivers, Universe Standings)
    ├── Week selector
    ├── View switcher (Home | Resources | Ambush & Matchups | Weekly Board | AI Tools)
    ├── [Home] ZombieWhispererCard, ZombieResourcesSummary, ZombieSurvivorsList,
    │         ZombieZombiesList, ZombieWinningsSummary, ZombieChompinBlock,
    │         ZombieMovementOutlook, ZombieWeeklyBoard
    ├── [Resources] ZombieResourcesView (serums, weapons, ambush, bomb, usage instructions)
    ├── [Ambush] ZombieAmbushBoard (matchups, ambush watch)
    ├── [Weekly Board] ZombieWeeklyBoard
    └── [AI] ZombieAIPanel (survival/zombie strategy, serum/weapon/ambush advice, movement, replacement)

Zombie Universe app pages
├── zombie-universe/page.tsx → list universes (ZombieUniverseListPage)
├── zombie-universe/[universeId]/page.tsx → tabs Standings | Forum
│   ├── ZombieUniverseStandingsClient (table, search, filter by level/status)
│   └── ZombieUniverseForumClient (pinned, threads)
├── zombie-universe/[universeId]/standings/page.tsx → ZombieUniverseStandingsClient
└── zombie-universe/[universeId]/forum/page.tsx → ZombieUniverseForumClient
```

---

## 3. File manifest ([NEW] / [UPDATED])

- **[NEW]** `components/zombie/types.ts`
- **[NEW]** `components/zombie/ZombieWhispererCard.tsx`
- **[NEW]** `components/zombie/ZombieSurvivorsList.tsx`
- **[NEW]** `components/zombie/ZombieZombiesList.tsx`
- **[NEW]** `components/zombie/ZombieWinningsSummary.tsx`
- **[NEW]** `components/zombie/ZombieResourcesSummary.tsx`
- **[NEW]** `components/zombie/ZombieChompinBlock.tsx`
- **[NEW]** `components/zombie/ZombieMovementOutlook.tsx`
- **[NEW]** `components/zombie/ZombieWeeklyBoard.tsx`
- **[NEW]** `components/zombie/ZombieResourcesView.tsx`
- **[NEW]** `components/zombie/ZombieAmbushBoard.tsx`
- **[NEW]** `components/zombie/ZombieAIPanel.tsx`
- **[NEW]** `components/zombie/ZombieHome.tsx`
- **[NEW]** `components/zombie/ZombieUniverseStandingsClient.tsx`
- **[NEW]** `components/zombie/ZombieUniverseForumClient.tsx`
- **[NEW]** `components/zombie/index.ts`
- **[UPDATED]** `components/app/tabs/OverviewTab.tsx` — import ZombieHome, isZombie prop, render ZombieHome when isZombie
- **[UPDATED]** `app/app/league/[leagueId]/page.tsx` — isZombie state from leagueVariant, pass isZombie to OverviewTab and renderTab
- **[NEW]** `app/api/zombie-universe/route.ts` — GET list universes
- **[UPDATED]** `app/api/leagues/[leagueId]/zombie/summary/route.ts` — rosterDisplayNames, myRosterId, myResources (serums, weapons, ambush)
- **[NEW]** `app/api/leagues/[leagueId]/zombie/ai/route.ts` — POST zombie AI (stub)
- **[NEW]** `app/app/zombie-universe/page.tsx`
- **[NEW]** `app/app/zombie-universe/[universeId]/page.tsx`
- **[NEW]** `app/app/zombie-universe/[universeId]/standings/page.tsx`
- **[NEW]** `app/app/zombie-universe/[universeId]/forum/page.tsx`

---

## 4. QA checklist (mandatory click audit)

- [ ] **League home loads** — Open a league with `leagueVariant: 'zombie'`; Overview tab shows Zombie branding, Whisperer card, Survivors, Zombies, resources summary, movement outlook, weekly board.
- [ ] **Universe standings page** — From league home click “Universe Standings” or go to `/app/zombie-universe`; select a universe; Standings tab shows table with level, team, status, points, winnings, serums, weapons, week killed, projected level.
- [ ] **Forum** — On universe home click Forum tab; pinned and discussion sections render (empty state or content).
- [ ] **Search/filter** — On standings table, use search box and level/status filters; table rows update.
- [ ] **Weekly board** — On league home, switch to “Weekly Board” view; section shows week and placeholder or update text.
- [ ] **Resource page** — On league home, switch to “Resources” view; serums, weapons, ambush, usage instructions and bomb (if enabled) display.
- [ ] **AI tools** — On league home, switch to “AI Tools”; topic selector and Generate button work; stub response or entitlement message shows.
- [ ] **Mobile layout** — View switcher is dropdown on small screens; tables and cards stack; no horizontal overflow.
- [ ] **Desktop layout** — View switcher is pills; grid and table use full width; links and buttons are tappable.
- [ ] **No dead forum buttons** — All links (Universe Standings, Open Standings full page, Open Forum full page, Back to Universe) navigate correctly.
- [ ] **No dead specialty-league actions** — Chat, Settings, AI Tools, Waivers, and Zombie view tabs all open or switch view as expected.

---

## 5. Implementation notes

- **Display names:** Zombie summary API returns `rosterDisplayNames` (rosterId → team/owner name) from LeagueTeam; all lists and tables use it with fallback to rosterId.
- **Chompin’ Block:** Home passes empty `candidates`; can be wired to lowest-scoring survivors when weekly scores are available.
- **Ambush board:** Matchups list is empty until wired to matchup API; ambush-used flag can come from ambush events.
- **Universe forum:** Pinned and threads are placeholder state; can be wired to league/universe chat or a dedicated posts table later.
- **AI panel:** Uses entitlement `zombie_ai`; POST `/api/leagues/[leagueId]/zombie/ai` returns stub narrative until LLM integration.
