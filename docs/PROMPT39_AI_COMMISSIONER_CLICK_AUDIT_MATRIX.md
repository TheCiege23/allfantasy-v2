# Prompt 39 — AI Commissioner Click Audit Matrix

Legend:

- `PASS` = handler/state/API/cache path verified end-to-end
- `FIXED` = issue discovered and corrected in this implementation pass

| ID | Component | Route | Interactive Element | Handler Verified | State Verified | API Wiring Verified | Persist/Reload Verified | Result |
|---|---|---|---|---|---|---|---|---|
| AC01 | `CommissionerTab` | `/app/league/[leagueId]?tab=Commissioner` | Commissioner dashboard entry | Tab render path exists | Commissioner tab active | `/api/commissioner/leagues/[leagueId]/check` gating preserved | Access state consistent across reload | PASS |
| AC02 | `AICommissionerPanel` | `/app/league/[leagueId]?tab=Commissioner` | Sport filter dropdown | `onChange -> setSport` | Sport state updates | `GET /api/leagues/[leagueId]/ai-commissioner?sport=` | Refetch reflects selected sport payload | PASS |
| AC03 | `AICommissionerPanel` | `/app/league/[leagueId]?tab=Commissioner` | Season input | `onChange -> setSeason` | Season state updates | Used by `POST /ai-commissioner/run` | Run payload includes current season value | PASS |
| AC04 | `AICommissionerPanel` | `/app/league/[leagueId]?tab=Commissioner` | Refresh button | `onClick -> load()` | Loading and error states reset | `GET /api/leagues/[leagueId]/ai-commissioner` | Fresh no-store payload replaces stale cards | PASS |
| AC05 | `AICommissionerPanel` | `/app/league/[leagueId]?tab=Commissioner` | Include resolved checkbox | `onChange -> load({ includeResolved })` | Filter state updates | `GET /ai-commissioner?includeResolved=` | Resolved alert rows reload correctly | PASS |
| AC06 | `AICommissionerPanel` | `/app/league/[leagueId]?tab=Commissioner` | Run AI cycle button | `onClick -> runCycle()` | Running/disabled states update | `POST /api/leagues/[leagueId]/ai-commissioner/run` | Newly generated alerts reloaded into list | PASS |
| AC07 | `AICommissionerPanel` | `/app/league/[leagueId]?tab=Commissioner` | Save behavior settings button | `onClick -> saveConfig()` | Saving/disabled states update | `PATCH /api/leagues/[leagueId]/ai-commissioner/config` | Updated config echoed and persisted | PASS |
| AC08 | `AICommissionerPanel` | `/app/league/[leagueId]?tab=Commissioner` | Lineup reminders toggle | Checkbox handler exists | Draft config toggles | Included in config PATCH body | Reload returns saved toggle value | PASS |
| AC09 | `AICommissionerPanel` | `/app/league/[leagueId]?tab=Commissioner` | Dispute analysis toggle | Checkbox handler exists | Draft config toggles | Included in config PATCH body | Reload returns saved toggle value | PASS |
| AC10 | `AICommissionerPanel` | `/app/league/[leagueId]?tab=Commissioner` | Collusion monitoring toggle | Checkbox handler exists | Draft config toggles | Included in config PATCH body | Reload returns saved toggle value | PASS |
| AC11 | `AICommissionerPanel` | `/app/league/[leagueId]?tab=Commissioner` | Vote suggestion toggle | Checkbox handler exists | Draft config toggles | Included in config PATCH body | Reload returns saved toggle value | PASS |
| AC12 | `AICommissionerPanel` | `/app/league/[leagueId]?tab=Commissioner` | Inactivity monitoring toggle | Checkbox handler exists | Draft config toggles | Included in config PATCH body | Reload returns saved toggle value | PASS |
| AC13 | `AICommissionerPanel` | `/app/league/[leagueId]?tab=Commissioner` | Notification mode selector | `onChange -> setDraft` | Draft mode updates | Included in config PATCH body | Mode persisted and reflected post-save | PASS |
| AC14 | `AICommissionerPanel` | `/app/league/[leagueId]?tab=Commissioner` | Alert card `Approve` | `mutateAlert(action='approve')` | Per-alert action loading state | `PATCH /api/leagues/[leagueId]/ai-commissioner/alerts/[alertId]` | Alert status updates after reload | PASS |
| AC15 | `AICommissionerPanel` | `/app/league/[leagueId]?tab=Commissioner` | Alert card `Dismiss` | `mutateAlert(action='dismiss')` | Per-alert action loading state | Alert status mutation endpoint | Dismissed state persists across refresh | PASS |
| AC16 | `AICommissionerPanel` | `/app/league/[leagueId]?tab=Commissioner` | Alert card `Snooze 24h` | `mutateAlert(action='snooze')` | Per-alert action loading state | Alert status mutation endpoint | `snoozedUntil` + status persist/reload | PASS |
| AC17 | `AICommissionerPanel` | `/app/league/[leagueId]?tab=Commissioner` | Alert card `Resolve` / `Reopen` | `mutateAlert(action='resolve|reopen')` | Button label state follows status | Alert status mutation endpoint | Resolved/open transitions persist | PASS |
| AC18 | `AICommissionerPanel` | `/app/league/[leagueId]?tab=Commissioner` | Alert card `Send notice` | `mutateAlert(action='send_notice')` | Per-alert action loading state | `PATCH /alerts/[alertId]` with `send_notice`; chat post path | Action log + notice action persists | PASS |
| AC19 | `AICommissionerPanel` | `/app/league/[leagueId]?tab=Commissioner` | Alert card `AI explain` | `explainAlert(alertId)` | Explain loading and per-row narrative state | `POST /api/leagues/[leagueId]/ai-commissioner/explain` | Latest narrative replaced and retained in row | PASS |
| AC20 | `AICommissionerPanel` | `/app/league/[leagueId]?tab=Commissioner` | `Open trade review context` link | Link handler present | N/A | Trade tab API path unchanged | Navigation stable with alert context preserved | PASS |
| AC21 | `AICommissionerPanel` | `/app/league/[leagueId]?tab=Commissioner` | `Open matchup context` link | Link handler present | N/A | Matchups tab API path unchanged | Navigation stable with alert context preserved | PASS |
| AC22 | `AICommissionerPanel` | `/app/league/[leagueId]?tab=Commissioner` | `Back to settings` link | Link handler present | N/A | N/A | Returns to settings tab reliably | PASS |
| AC23 | `CommissionerControlsPanel` | `/app/league/[leagueId]?tab=Settings` | `AI Commissioner alerts` quick link | Link handler added | N/A | N/A | Lands at commissioner tab entry point | FIXED |
| AC24 | `CommissionerControlsPanel` | `/app/league/[leagueId]?tab=Settings` | Settings quick-jump buttons | Link handler exists | N/A | N/A | Now route with `settingsTab` query for correct subpanel | FIXED |
| AC25 | `LeagueSettingsTab` | `/app/league/[leagueId]?tab=Settings&settingsTab=*` | Settings sub-tab deep-link resolution | Search-param effect added | `active` tab updates from query | N/A | Correct sub-tab opens on navigation/reload | FIXED |
| AC26 | `CommissionerTab` | `/app/league/[leagueId]?tab=Commissioner` | Trust/Edit/Replace/Assign quick links | Link handlers updated | N/A | N/A | Now target specific settings sub-tabs (no bad redirects) | FIXED |
| AC27 | `run` API | `/api/leagues/[leagueId]/ai-commissioner/run` | Refresh governance action | POST handler exists | N/A | `runAICommissionerCycle` orchestration wired | Created/touched alerts visible on next GET | PASS |
| AC28 | `alerts` API | `/api/leagues/[leagueId]/ai-commissioner/alerts/[alertId]` | Approve/dismiss/snooze/resolve/reopen/send_notice actions | PATCH parser and action dispatch | N/A | `updateAICommissionerAlertStatus` + chat notice path + action logs | Action results persist in alert center | PASS |
| AC29 | `explain` API | `/api/leagues/[leagueId]/ai-commissioner/explain` | Alert explanation action | POST handler exists | N/A | `buildDisputeContext` + `openaiChatText` fallback wiring | Deterministic fallback returns if AI unavailable | PASS |
| AC30 | `AICommissionerService` + notifications | backend service | Commissioner alert fanout | Service fanout logic exists | N/A | `dispatchNotification(category='commissioner_alerts')` and optional chat post | New alerts notify and remain queryable in DB | PASS |

## Automated verification executed

- `e2e/ai-commissioner-click-audit.spec.ts`
- `e2e/commissioner-lineup-click-audit.spec.ts`
- `npm run -s typecheck`

Final run status: all passed.
