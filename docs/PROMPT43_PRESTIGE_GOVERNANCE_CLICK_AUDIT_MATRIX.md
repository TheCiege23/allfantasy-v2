# Prompt 43 Click Audit Matrix

| # | Surface | Route / Component | Click / Control | Handler | Backend / API | Result |
|---|---------|-------------------|-----------------|---------|---------------|--------|
| 1 | League shell | `components/app/LeagueShell.tsx` | Tab nav click | `handleTabChange` | n/a | PASS (query preserved + tab updated) |
| 2 | Commissioner | `CommissionerTab` | Trust scores link | `Link` nav | n/a | PASS |
| 3 | Commissioner | `CommissionerTab` | Legacy leaderboard link | `Link` nav | n/a | PASS |
| 4 | Commissioner | `CommissionerTab` | Hall of Fame link | `Link` nav | n/a | PASS |
| 5 | Commissioner | `CommissionerTab` | Prestige snapshot load | `useEffect` fetch | `GET /prestige-governance` | FIXED (non-blocking fetch) |
| 6 | AI Commissioner | `AICommissionerPanel` | Alert manager -> trust | `Link` nav | reputation panel route | FIXED |
| 7 | AI Commissioner | `AICommissionerPanel` | Alert manager -> legacy | `Link` nav | legacy breakdown route | FIXED |
| 8 | AI Commissioner | `AICommissionerPanel` | Refresh | `load()` | `GET /ai-commissioner` | PASS |
| 9 | AI Commissioner | `AICommissionerPanel` | Run AI cycle | `runCycle()` | `POST /ai-commissioner/run` | PASS |
| 10 | AI Commissioner | `AICommissionerPanel` | Explain alert | `explainAlert()` | `POST /ai-commissioner/explain` | PASS (now includes prestige context) |
| 11 | Reputation | `ReputationPanel` | Sport filter | `setSportFilter` | `GET /reputation` | PASS |
| 12 | Reputation | `ReputationPanel` | Season filter | `setSeasonFilter` | `GET /reputation` | PASS |
| 13 | Reputation | `ReputationPanel` | Tier filter | `setTierFilter` | `GET /reputation` | PASS |
| 14 | Reputation | `ReputationPanel` | Refresh | `refreshAll()` | multi-fetch (`reputation`, `config`, `prestige-context`) | PASS |
| 15 | Reputation | `ReputationPanel` | AI explain manager | `explainManager()` | `POST /reputation/explain`, `GET /reputation/evidence` | PASS |
| 16 | Reputation | `ReputationPanel` | Legacy breakdown link | `Link` nav | legacy breakdown route | FIXED (converted to Link + testid) |
| 17 | Reputation | `ReputationPanel` | Unified prestige hint | `<details>` render | `GET /prestige-context` | FIXED |
| 18 | Hall of Fame entry detail | entry page | View legacy score | `Link` nav | legacy breakdown route | PASS |
| 19 | Hall of Fame entry detail | entry API | Entry load | `fetch` | `GET /hall-of-fame/entries/[entryId]` | FIXED (bridged `legacy` payload) |
| 20 | Hall of Fame moment detail | moment page | Related manager legacy link | `Link` nav | legacy breakdown route | PASS |
| 21 | Hall of Fame moment detail | moment page | Related team legacy link | `Link` nav | legacy breakdown route | FIXED |
| 22 | Hall of Fame moment detail | moment API | Moment load | `fetch` | `GET /hall-of-fame/moments/[momentId]` | FIXED (`relatedLegacy` bridge) |
| 23 | Graph insight | `graph-insight` route | AI explain generation | `POST` handler | `buildAIPrestigeContext` + graph services | FIXED (sport propagated) |
| 24 | Prestige context API | `prestige-context` route | Context fetch | `GET` handler | prestige-governance services | FIXED (dedup commissioner trust path) |
| 25 | Prestige governance API | `prestige-governance` route | Unified snapshot fetch | `GET` handler | orchestrator + query services | NEW PASS |
| 26 | Legacy tab | `LegacyTab` | Run engine | `runEngine()` | `POST /legacy-score/run` | PASS |
| 27 | Legacy tab | `LegacyTab` | AI explain row | `explain()` | `POST /legacy-score/explain` | PASS |
| 28 | Legacy breakdown | breakdown page | Trust / HoF links | `Link` nav | settings/hof routes | PASS |
| 29 | HoF section | `HallOfFameSection` | Footer links (Legacy/Reputation) | anchors | tab routes | PASS |
| 30 | Cross-suite E2E | `e2e/*.spec.ts` | Full integration run | Playwright tests | subsystem APIs | PASS (24/24) |

## Result Summary

- PASS: 21
- FIXED: 8
- NEW PASS: 1
- Total audited interactions: 30
