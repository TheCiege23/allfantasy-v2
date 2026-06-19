# Redraft Production Smoke Blockers

Status: smoke-blocker fixes implemented in `fix/redraft-production-smoke-blockers`.

No production data writes, provider syncs, or env changes were used.

## Findings And Fixes

| Finding | Root cause | Files changed | Fix | Tests |
| --- | --- | --- | --- | --- |
| NCAAF redraft used the wrong league shell and intro/setup flow | Core redraft shell gate only accepted `NFL` | `lib/league/is-nfl-redraft-core-dashboard.ts` | Allow `NFL` and `NCAAF` redraft while still excluding dynasty, guillotine, best ball, keeper phase, and specialty variants | `__tests__/nfl-redraft-league-dashboard.test.ts`, `__tests__/redraft-production-smoke-blockers.test.ts` |
| Pre-draft CTA said "Open draft room setup" but opened the draft room | Copy did not distinguish room entry from settings | `app/league/[leagueId]/LeagueShell.tsx` | Rename CTA to "Open Live Draft Room"; keep Draft Settings as the date/type/timer path | `__tests__/redraft-league-ux-regression.test.ts`, `__tests__/redraft-production-smoke-blockers.test.ts` |
| Settings modal sometimes would not close and could reopen into broken state | Close paths disagreed when a sub-panel was active | `app/league/[leagueId]/components/LeagueSettingsModal.tsx` | Add one `handleCloseAll` used by overlay, Escape, and X buttons; clear active panel on close; preserve scroll-lock cleanup | `__tests__/redraft-league-ux-regression.test.ts`, `__tests__/redraft-production-smoke-blockers.test.ts` |
| Draft Settings opened duplicate panels in the draft room | Commissioner control center nested `DraftSettingsModal` inside another overlay | `components/app/draft-room/CommissionerControlCenterModal.tsx`, `components/app/draft-room/DraftRoomPageClient.tsx`, `components/app/draft-room/DraftRoomSettingsModal.tsx`, `components/app/draft-room/DraftTopBar.tsx` | Control center now delegates to the single room settings modal; menu labels distinguish room preferences from commissioner controls | `__tests__/draft/slice1-draft-settings-modal-source.test.ts`, `__tests__/redraft-production-smoke-blockers.test.ts` |
| Standard redraft settings exposed keeper/dynasty/devy/C2C concepts | Generic draft settings surfaced specialty controls in regular redraft contexts | `app/league/[leagueId]/components/settings/DraftSettingsPanel.tsx`, `components/app/draft-room/CommissionerControlCenterModal.tsx` | Remove dynasty carryover copy; remove keeper automation from standard control center; gate Devy/C2C sections behind actual enabled config | `__tests__/redraft-production-smoke-blockers.test.ts` |
| Roster settings looked unfinished and did not show Superflex | Roster panel only exposed max roster/IR/taxi knobs | `app/league/[leagueId]/components/settings/RosterComplianceSettingsPanel.tsx` | Add polished colored slot rows for QB/RB/WR/TE/FLX/SF/K/DEF/BN/IR; SF defaults to 0; reserve/taxi details live under advanced settings | `__tests__/redraft-production-smoke-blockers.test.ts` |
| Start/resume could block on cold player-pool cache, and resume could stay stuck paused | Controls route returned `POOL_NOT_READY` instead of applying the action; client refreshed the entire pool after simple controls | `app/api/leagues/[leagueId]/draft/controls/route.ts`, `hooks/useCommissionerActions.ts` | Start/resume now trigger background prewarm and proceed; pause/resume/start no longer refetch the full pool on success | `__tests__/draft/pool-prewarm-controls.test.ts`, `__tests__/redraft-production-smoke-blockers.test.ts` |
| Draft chat send could jump the whole page | Chat auto-scroll used `scrollIntoView` on a sentinel | `components/app/draft-room/DraftChatPanel.tsx` | Scroll the internal chat container with `scrollTop = scrollHeight`; add scroll-root test id | `__tests__/redraft-production-smoke-blockers.test.ts` |
| Player pool took too much of the draft room | Expanded bottom dock height was too large for smoke-test usage | `components/app/draft-room/DraftRoomShell.tsx` | Increase board cap to 60vh and reduce bottom dock cap to 220px/30vh with internal scroll | `__tests__/draft/d6-2-board-proportions-and-clock.test.ts` |
| War Room was hard to find in the draft room | Extra-wide right dock only showed Queue/Roster/Chat; fallback tab was labeled AI | `components/app/draft-room/DraftRightDockTabs.tsx`, `components/app/draft-room/DraftRoomPageClient.tsx` | Add a visible War Room right-dock tab fed by the same DraftTeamPanel content; relabel fallback AI tab to War Room | `__tests__/draft/d6-1-right-dock-tabs.test.ts`, `__tests__/redraft-production-smoke-blockers.test.ts` |
| League-launched mock draft showed the global chooser | Mock client only loaded from the Sleeper list and ignored direct AllFantasy league context | `app/mock-draft/page.tsx`, `components/mock-draft/MockDraftSleeperRoomClient.tsx` | Pass `leagueId`/`sport` from the page; auto-load direct league context, including AllFantasy-created leagues not in the Sleeper list | `__tests__/redraft-production-smoke-blockers.test.ts` |
| Mock completion had no clear exit path | Completion view only showed draft again/share/grade actions | `components/mock-draft/MockDraftSleeperRoomClient.tsx` | Add league-aware title, Back to League, and Back to Draft Room links; keep share URL based on current origin, with no CafeConChimmy hardcode | `__tests__/redraft-production-smoke-blockers.test.ts` |

## Manual Smoke Checklist

1. Create NFL redraft and NCAAF redraft leagues.
2. Confirm both show the redraft intro/setup flow, Draft tab, Draft Settings, Open Live Draft Room, and Start Mock Draft.
3. Open League Settings, enter Draft and Roster panels, close via X, overlay, and Escape, then reopen twice.
4. In Roster settings, confirm SF is visible at `0`, FLX is visible, and position badges are distinct colors.
5. Confirm regular redraft draft settings do not show dynasty carryover, keeper automation, or ungated Devy/C2C sections.
6. Enter live draft room, open Commissioner Control Center, then Room Settings, and confirm only one settings surface appears.
7. Start, pause, and resume a draft; timer should stop while paused and resume without waiting on player-pool warming.
8. Confirm player pool is internally scrollable and does not dominate the whole room.
9. Confirm War Room appears as a visible right-dock tab and fallback/mobile tab.
10. Send draft chat messages after scrolling the draft page; only the chat panel should auto-scroll.
11. Launch mock draft from inside a league; it should skip the global chooser and use that league.
12. Launch mock draft from global nav/dashboard; it should still show the import/custom chooser.
13. Finish a mock draft and confirm Back to League, Back to Draft Room, Draft Again, Grade My Team, and Copy Share URL are available.
14. Confirm no share text or URL hardcodes CafeConChimmy.

## Remaining Notes

Mock and live draft visual parity still has deeper follow-up work around fully shared board primitives, richer mock player media, and future AF ADP sourced from site-wide draft history. This patch does not fabricate AI ADP, stats, headshots, logos, or projections.
