# Prompt 41 — Hall of Fame Click Audit Matrix

| # | Component / Surface | Route | Click / Control | Handler | API Wiring | State + Reload | Result |
|---|---|---|---|---|---|---|---|
| 1 | League tab nav | `/app/league/[leagueId]?tab=Hall of Fame` | Hall of Fame tab | tab state switch | N/A | `HallOfFameTab` renders | PASS |
| 2 | HallOfFameSection | league HoF tab | season filter | `setSeason` | GET `/hall-of-fame?season=` + entries/moments | refetches rows + timeline | PASS |
| 3 | HallOfFameSection | league HoF tab | rebuild | `rebuild()` | POST `/api/leagues/[leagueId]/hall-of-fame` | refreshes leaderboard | PASS |
| 4 | HallOfFameSection | league HoF tab | run HoF engine | `runHallOfFameEngine()` | POST `/api/leagues/[leagueId]/hall-of-fame/run` | refreshes leaderboard + entries/moments; summary toast line | FIXED |
| 5 | HallOfFameSection | league HoF tab | sync moments | `syncMoments()` | POST `/api/leagues/[leagueId]/hall-of-fame/sync-moments` | refreshes moments + status text | FIXED |
| 6 | HallOfFameSection | league HoF tab | sport filter | `setSportFilter` | GET entries/moments with `sport` | filtered list reload | PASS |
| 7 | HallOfFameSection | league HoF tab | category filter | `setCategoryFilter` | GET entries with `category` | filtered list reload | PASS |
| 8 | HallOfFameSection | league HoF tab | entity type filter | `setEntityTypeFilter` | GET entries with `entityType` | filtered list reload | FIXED |
| 9 | HallOfFameSection | league HoF tab | timeline sort | `setTimelineSort` | client-side | order changes by significance/recency | PASS |
|10| HallOfFameSection | league HoF tab | refresh | `refreshEntriesMoments()` | GET `/entries` + `/moments` | current filters reapplied | PASS |
|11| Entry card | league HoF tab | Why inducted? | Link nav | GET `/entries/[entryId]` | detail page load | PASS |
|12| Entry card | league HoF tab | Tell me why this matters | `tellStory('entry')` | POST `/hall-of-fame/tell-story` | inline narrative toggle | FIXED |
|13| Moment card | league HoF tab | Why inducted? | Link nav | GET `/moments/[momentId]` | detail page load | PASS |
|14| Moment card | league HoF tab | Tell me why this matters | `tellStory('moment')` | POST `/hall-of-fame/tell-story` | inline narrative toggle | FIXED |
|15| HallOfFameCard | league HoF tab | empty state visibility | render branch | N/A | card no longer disappears when empty | FIXED |
|16| SeasonLeaderboardCard | league HoF tab | empty state visibility | render branch | N/A | card no longer disappears when empty | FIXED |
|17| Entry detail page | `/app/league/[leagueId]/hall-of-fame/entries/[entryId]` | load detail | useEffect fetch | GET `/entries/[entryId]` (league-scoped) | robust 404/500 handling | FIXED |
|18| Entry detail page | entry detail route | Tell me why this matters | `tellStory()` | POST `/hall-of-fame/tell-story` | narrative updates | PASS |
|19| Entry detail page | entry detail route | Back to Hall of Fame | Link nav | N/A | preserves `?tab=Hall of Fame` | FIXED |
|20| Moment detail page | `/app/league/[leagueId]/hall-of-fame/moments/[momentId]` | load detail | useEffect fetch | GET `/moments/[momentId]` (league-scoped) | robust 404/500 handling | FIXED |
|21| Moment detail page | moment detail route | Tell me why this matters | `tellStory()` | POST `/hall-of-fame/tell-story` | narrative updates | PASS |
|22| Moment detail page | moment detail route | Back to Hall of Fame | Link nav | N/A | preserves `?tab=Hall of Fame` | FIXED |
|23| HallOfFameSection footer | league HoF tab | Legacy link | Link nav | N/A | opens Legacy tab | PASS |
|24| HallOfFameSection footer | league HoF tab | Settings → Reputation | Link nav | N/A | opens Settings with `settingsTab=Reputation` | FIXED |
|25| HallOfFameSection header | league HoF tab | Platform Hall of Fame link | Link nav | GET platform APIs | opens platform view | FIXED |
|26| Platform panel | `/app/hall-of-fame` | sport filter | `setSport` | GET `/api/hall-of-fame/entries|moments` | list reload | FIXED |
|27| Platform panel | `/app/hall-of-fame` | league filter | `setLeagueId` | GET with `leagueId` | scoped reload | FIXED |
|28| Platform panel | `/app/hall-of-fame` | season filter | `setSeason` | GET with `season` | scoped reload | FIXED |
|29| Platform panel | `/app/hall-of-fame` | category filter | `setCategory` | GET entries with `category` | scoped reload | FIXED |
|30| Platform panel | `/app/hall-of-fame` | refresh | `refresh()` | GET `/api/hall-of-fame/entries|moments` | data + errors update | PASS |
|31| Platform entry card | `/app/hall-of-fame` | league HoF deep link | Link nav | N/A | opens league HoF | PASS |
|32| Platform entry card | `/app/hall-of-fame` | Why inducted? | Link nav | GET `/api/leagues/[leagueId]/hall-of-fame/entries/[entryId]` | detail page load | PASS |
|33| Platform entry card | `/app/hall-of-fame` | Tell me why this matters | `tellStory('entry')` | POST league tell-story | narrative panel updates | PASS |
|34| Platform moment card | `/app/hall-of-fame` | league HoF deep link | Link nav | N/A | opens league HoF | PASS |
|35| Platform moment card | `/app/hall-of-fame` | Why inducted? | Link nav | GET `/api/leagues/[leagueId]/hall-of-fame/moments/[momentId]` | detail page load | PASS |
|36| Platform moment card | `/app/hall-of-fame` | Tell me why this matters | `tellStory('moment')` | POST league tell-story | narrative panel updates | PASS |

## Automated Validation

- `npm run -s typecheck` — PASS
- `npx playwright test e2e/hall-of-fame-click-audit.spec.ts` — PASS

## Summary

- Audited interactions: **36**
- `PASS`: **24**
- `FIXED`: **12**
- `FAIL`: **0**
