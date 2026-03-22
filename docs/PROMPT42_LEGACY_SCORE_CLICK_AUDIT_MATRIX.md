# Prompt 42 — Legacy Score Click Audit Matrix

| # | Component / Surface | Route | Click / Control | Handler | API Wiring | State + Reload | Result |
|---|---|---|---|---|---|---|---|
| 1 | League shell tab nav | `/app/league/[leagueId]?tab=Legacy` | Legacy tab | tab state switch | N/A | `LegacyTab` renders | PASS |
| 2 | LegacyTab header | league Legacy tab | sport filter | `setSportFilter` | GET `/api/leagues/[leagueId]/legacy-score?sport=` | leaderboard refreshes | PASS |
| 3 | LegacyTab header | league Legacy tab | entity type filter | `setEntityTypeFilter` | GET with `entityType` | leaderboard scope updates | FIXED |
| 4 | LegacyTab header | league Legacy tab | refresh | `refresh()` | GET leaderboard | keeps current filter scope | PASS |
| 5 | LegacyTab header | league Legacy tab | run engine | `runEngine()` | POST `/api/leagues/[leagueId]/legacy-score/run` | summary + refresh + error handling | FIXED |
| 6 | LegacyTab card | league Legacy tab | AI explain | `explain(record)` | POST `/api/leagues/[leagueId]/legacy-score/explain` | inline narrative toggle | FIXED |
| 7 | LegacyTab card | league Legacy tab | Why is this score high? | `Link` nav | GET `/legacy-score/breakdown` | opens breakdown page | PASS |
| 8 | LegacyTab card | league Legacy tab | breakdown link sport context | URL includes `sport` | GET breakdown uses sport | correct sport-scoped record | FIXED |
| 9 | LegacyTab compare panel | league Legacy tab | compare A selector | `setCompareA` | client-side | card A re-renders | PASS |
| 10 | LegacyTab compare panel | league Legacy tab | compare B selector | `setCompareB` | client-side | card B re-renders | PASS |
| 11 | LegacyTab compare panel | league Legacy tab | score breakdown link A/B | `Link` nav | GET breakdown | correct entity + sport params | PASS |
| 12 | LegacyTab cross-link | league Legacy tab | Hall of Fame | `Link` nav | N/A | tab switch to HoF | PASS |
| 13 | LegacyTab cross-link | league Legacy tab | Trust scores (Reputation) | `Link` nav | N/A | tab switch to settings/reputation | PASS |
| 14 | LegacyTab cross-link | league Legacy tab | Platform legacy leaderboard | `Link` nav | GET platform legacy route | opens platform board | FIXED |
| 15 | Legacy breakdown page | `/app/league/[leagueId]/legacy/breakdown` | initial load | `useEffect` fetch | GET `/legacy-score/breakdown` | loading/error handled | FIXED |
| 16 | Legacy breakdown page | breakdown route | Why is this score high? button | `tellStory()` | POST `/legacy-score/explain` | narrative panel updates | FIXED |
| 17 | Legacy breakdown page | breakdown route | Back to Legacy | `Link` nav | N/A | preserves `?tab=Legacy` context | FIXED |
| 18 | Legacy badge | partner/profile cards | badge load | `useEffect` fetch | GET `/legacy-score?entityType&entityId&sport?` | loading/empty/error states | FIXED |
| 19 | PartnerMatchView | league partners view | Legacy link | `Link` nav | GET breakdown page | sport context forwarded when available | FIXED |
| 20 | PartnerMatchView | league partners view | Legacy badge render | component mount | GET single legacy record | card updates without dead state | FIXED |
| 21 | Reputation panel | settings → Reputation | Legacy breakdown link | `<a href>` | GET breakdown | now includes `sport` param | FIXED |
| 22 | HoF entry detail | `/hall-of-fame/entries/[entryId]` | View legacy score | `<a href>` | GET breakdown | includes entry sport context | FIXED |
| 23 | HoF moment detail | `/hall-of-fame/moments/[momentId]` | manager legacy links | map link render | GET breakdown | includes moment sport context | FIXED |
| 24 | Legacy API (league) | `/api/leagues/[leagueId]/legacy-score` | single record query | GET with entity params | `getLegacyScoreByEntity` | alias-aware entity resolution | FIXED |
| 25 | Legacy API (league) | `/api/leagues/[leagueId]/legacy-score` | leaderboard query | GET list params | `queryLegacyLeaderboard` | sport normalized by scope | FIXED |
| 26 | Legacy API run | `/api/leagues/[leagueId]/legacy-score/run` | run request | POST | `runLegacyScoreEngineForLeague` | manager/team/franchise counts returned | FIXED |
| 27 | Legacy API explain | `/api/leagues/[leagueId]/legacy-score/explain` | explain request | POST | record lookup + AI/fallback narrative | source-aware response | FIXED |
| 28 | Legacy API breakdown | `/api/leagues/[leagueId]/legacy-score/breakdown` | breakdown request | GET | sport normalized + context build | robust 4xx/5xx behavior | FIXED |
| 29 | Platform legacy panel | `/app/legacy-score` | sport filter | `setSportFilter` | GET `/api/legacy-score/leaderboard` | scoped reload | PASS |
| 30 | Platform legacy panel | `/app/legacy-score` | entity filter | `setEntityTypeFilter` | GET leaderboard | scoped reload | PASS |
| 31 | Platform legacy panel | `/app/legacy-score` | leagueId filter | `setLeagueIdFilter` | GET leaderboard | scoped reload | PASS |
| 32 | Platform legacy panel | `/app/legacy-score` | refresh | `refresh()` | GET leaderboard | state + errors update | PASS |
| 33 | Platform legacy row | `/app/legacy-score` | Open league Legacy tab | `Link` nav | N/A | opens league Legacy scope | PASS |
| 34 | Platform legacy row | `/app/legacy-score` | Why is this score high? | `Link` nav | GET league breakdown | deep-link with sport | PASS |
| 35 | Platform legacy row | `/app/legacy-score` | AI explain | `explainRow()` | POST league explain | narrative panel updates | PASS |
| 36 | Power rankings page | `/app/power-rankings` | full legacy leaderboard link | `Link` nav | N/A | opens `/app/legacy-score` | FIXED |

## Automated Validation

- `npm run -s typecheck` — PASS
- `npx playwright test e2e/legacy-score-click-audit.spec.ts` — PASS

## Summary

- Audited interactions: **36**
- `PASS`: **19**
- `FIXED`: **17**
- `FAIL`: **0**
