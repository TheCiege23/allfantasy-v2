# Prompt 40 — Reputation Click Audit Matrix

Legend:

- `PASS` = verified handler/state/API/reload path
- `FIXED` = issue found and corrected in this pass

| ID | Component | Route | Interactive Element | Handler Verified | State Verified | API Wiring Verified | Persist/Reload Verified | Result |
|---|---|---|---|---|---|---|---|---|
| RP01 | `ReputationPanel` | `/app/league/[leagueId]?tab=Settings&settingsTab=Reputation` | Sport filter | `onChange -> setSportFilter` | Sport state updates | `GET /reputation?sport=` | Filtered rows reload correctly | PASS |
| RP02 | `ReputationPanel` | same | Season filter | `onChange -> setSeasonFilter` | Season state updates | `GET /reputation?season=` | Season-scoped rows reload | PASS |
| RP03 | `ReputationPanel` | same | Tier filter | `onChange -> setTierFilter` | Tier state updates | `GET /reputation?tier=` | Tier-scoped rows reload | PASS |
| RP04 | `ReputationPanel` | same | Refresh button | `onClick -> refreshAll()` | Loading/error reset | `GET /reputation`, `GET /reputation/config`, `GET /prestige-context` | Fresh state replaces stale payload | PASS |
| RP05 | `ReputationPanel` | same | Run reputation engine | `onClick -> runEngine()` | Running state and summary update | `POST /reputation/run` | Updated rows visible after reload | PASS |
| RP06 | `ReputationPanel` | same | Save reputation config | `onClick -> saveConfig()` | Saving state and draft updates | `PATCH /reputation/config` | Saved thresholds/weights reflected on reload | PASS |
| RP07 | `ReputationPanel` | same | Tier threshold inputs | input handlers wired | Draft threshold state updates | Included in config PATCH payload | Reload shows saved values | PASS |
| RP08 | `ReputationPanel` | same | Score weight inputs | input handlers wired | Draft weight state updates | Included in config PATCH payload | Reload shows saved values | PASS |
| RP09 | `ReputationPanel` | same | Explain-manager select | `onChange -> setSelectedManagerId` | selected manager updates | Used by explain/evidence APIs | Drill-down follows selected manager | PASS |
| RP10 | `ReputationPanel` | same | Evidence type filter select | `onChange -> setSelectedEvidenceType` | evidence filter state updates | `GET /reputation/evidence?evidenceType=` | Evidence list updates by type | PASS |
| RP11 | `ReputationPanel` | same | AI explain button | `onClick -> explainManager()` | explain loading + narrative state | `POST /reputation/explain` | Current narrative replaces old response | PASS |
| RP12 | `ReputationPanel` | same | Evidence drill-down load | inside `explainManager()` | evidence rows state updates | `GET /reputation/evidence` | Current evidence rows shown in panel | PASS |
| RP13 | `ReputationPanel` | same | Legacy breakdown link | anchor wiring | N/A | N/A | Deep-link route resolves manager breakdown | PASS |
| RP14 | `ReputationPanel` | same | Trade fairness context link | link wiring | N/A | N/A | Navigates to Trades context | PASS |
| RP15 | `ReputationPanel` | same | Manager card `Drill down` | button handler | selected manager / compare-A state updates | reused explain/compare APIs | Row drill-down targets selected manager | PASS |
| RP16 | `ReputationPanel` | same | Manager card `Set compare target` | button handler | compare-B state updates | reused compare API | Compare target persists until change | PASS |
| RP17 | `ReputationPanel` | same | Manager comparison run | `onClick -> runComparison()` | comparison loading + payload state | `GET /reputation/compare` | Compare panel updates from response | PASS |
| RP18 | `ReputationPanel` | same | Commissioner trust context card | load path verified | commissionerContext state updates | `GET /prestige-context` | Context reflects latest refresh | PASS |
| RP19 | `ReputationPanel` | same | Commissioner trust view quick link | link wiring | N/A | N/A | Jumps to Commissioner tab | PASS |
| RP20 | `ReputationBadge` | partner cards / trust surfaces | Badge fetch path | `useEffect` fetch handler | loading/error/no-data states | `GET /reputation?managerId=` | No silent disappearance on missing/error data | FIXED |
| RP21 | `ReputationBadge` | partner cards / trust surfaces | Trade fairness inline display | render path wired | optional display state | Uses same reputation payload | Trade fairness refreshes with badge | PASS |
| RP22 | `PartnerMatchView` | `/trade-finder` | Trust context link | link handler added | N/A | N/A | Deep-links to settings reputation manager context | FIXED |
| RP23 | `PartnerMatchView` | `/trade-finder` | Reputation badge in partner card | component integration verified | loading/no-data states visible | reputation GET route | Badges show and refresh correctly | PASS |
| RP24 | `PartnerMatchView` | `/trade-finder` | Partner trust detail card | render from API payload | state uses route payload | `/api/trade-partner-match` now includes reputation | Trade fairness/trust context appears on reload | FIXED |
| RP25 | `LegacyTab` | `/app/league/[leagueId]?tab=Legacy` | Trust scores quick link | href corrected | N/A | N/A | Opens `settingsTab=Reputation` directly | FIXED |
| RP26 | `reputation` API | `/api/leagues/[leagueId]/reputation` | sport/season/tier query parsing | handler verified | N/A | query service wired | Filtered output stable across reload | PASS |
| RP27 | `reputation/evidence` API | `/api/leagues/[leagueId]/reputation/evidence` | evidenceType/season query parsing | handler verified | N/A | query service wired | Drill-down reproducible with same filters | PASS |
| RP28 | `reputation/explain` API | `/api/leagues/[leagueId]/reputation/explain` | AI explain action | handler verified | N/A | OpenAI + fallback wiring | Deterministic fallback works if AI fails | PASS |

## Automated verification

- `npm run -s typecheck`
- `npm run test:e2e -- "e2e/reputation-system-click-audit.spec.ts" --project=chromium`
- `npm run test:e2e -- "e2e/reputation-system-click-audit.spec.ts" "e2e/ai-commissioner-click-audit.spec.ts" "e2e/commissioner-lineup-click-audit.spec.ts" --project=chromium`

Final status: passed.
