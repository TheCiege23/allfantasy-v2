# Prompt 37 — League Drama Click Audit Matrix

| ID | Surface | Clickable Element | Component / Route | Handler | State Update | API Wiring | Cache / Reload | Status |
|---|---|---|---|---|---|---|---|---|
| D01 | Overview widget | Sport filter | `LeagueDramaWidget` | `setSport` -> `load()` | `sport`, `events`, `loading/error` | GET `/drama?sport=` | no-store | PASS |
| D02 | Overview widget | Season filter | `LeagueDramaWidget` | `setSeason` -> `load()` | `season`, `events`, `loading/error` | GET `/drama?season=` | no-store | PASS |
| D03 | Overview widget | Drama type filter | `LeagueDramaWidget` | `setDramaTypeFilter` -> `load()` | `dramaTypeFilter` | GET `/drama?dramaType=` | no-store | PASS |
| D04 | Overview widget | Refresh | `LeagueDramaWidget` | `runEngine()` | `running` + refresh events | POST `/drama/run` -> GET `/drama` | direct reload | PASS |
| D05 | Overview widget | Reload | `LeagueDramaWidget` | `load()` | `loading/error/events` | GET `/drama` | no-store | PASS |
| D06 | Overview widget | Story button | `LeagueDramaWidget` | `tellStory(eventId)` | `storyEventId`, `storyLoading`, `storyNarrative` | POST `/drama/tell-story` | toggle hide/show | PASS |
| D07 | Overview widget | View event | `LeagueDramaWidget` | `Link` | route nav | GET `/drama/[eventId]` on detail load | detail refresh available | PASS |
| D08 | Overview widget | Timeline link | `LeagueDramaWidget` | `Link` | route nav | GET `/drama/timeline` | dashboard controls | PASS |
| D09 | Overview widget | Trade context link | `LeagueDramaWidget` | `Link` | route nav | none | route-level refresh | PASS |
| D10 | Settings panel | Run engine | `LeagueDramaPanel` | `runEngine()` | `running`, `result/error` | POST `/drama/run` | `router.refresh()` | PASS |
| D11 | Settings panel | Sport selector | `LeagueDramaPanel` | `setSport` | `sport` | POST body uses value | n/a | PASS |
| D12 | Settings panel | Season input | `LeagueDramaPanel` | `setSeason` | `season` | POST body uses value | n/a | PASS |
| D13 | Settings panel | Open timeline | `LeagueDramaPanel` | `Link` | route nav | timeline APIs | dashboard controls | PASS |
| D14 | Dashboard | Sport filter | `app/app/league/[leagueId]/drama/page.tsx` | `setSportFilter` | reset offset + reload | GET `/drama/timeline` | no-store | PASS |
| D15 | Dashboard | Season filter | dashboard page | `setSeasonFilter` | reset offset + reload | GET `/drama/timeline` | no-store | PASS |
| D16 | Dashboard | Type filter | dashboard page | `setDramaTypeFilter` | reset offset + reload | GET `/drama/timeline` | no-store | PASS |
| D17 | Dashboard | Min score filter | dashboard page | `setMinScoreFilter` | reset offset + reload | GET `/drama/timeline` | no-store | PASS |
| D18 | Dashboard | Refresh storylines | dashboard page | `runEngine()` | `running/error` | POST `/drama/run` then GET `/drama/timeline` | refreshed dataset | PASS |
| D19 | Dashboard | Reload timeline | dashboard page | `load()` | `loading/error/timeline` | GET `/drama/timeline` | no-store | PASS |
| D20 | Dashboard | Prev page | dashboard page | `setOffset(offset - limit)` | offset/timeline | GET `/drama/timeline?offset=` | paginated timeline | PASS |
| D21 | Dashboard | Next page | dashboard page | `setOffset(offset + limit)` | offset/timeline | GET `/drama/timeline?offset=` | paginated timeline | PASS |
| D22 | Dashboard | Story action | dashboard page | `tellStory(eventId)` | `storyByEvent` + loading state | POST `/drama/tell-story` | toggle hide/show | PASS |
| D23 | Dashboard | Story detail link | dashboard page | `Link` | route nav | GET `/drama/[eventId]` | detail refresh available | PASS |
| D24 | Detail page | Back to league | `drama/[eventId]/page.tsx` | `Link` | route nav | none | n/a | PASS |
| D25 | Detail page | Open drama timeline | `drama/[eventId]/page.tsx` | `Link` | route nav | timeline APIs | dashboard reload | PASS |
| D26 | Detail page | Refresh page | `drama/[eventId]/page.tsx` | `router.refresh()` | refresh event state | GET `/drama/[eventId]` | no-store | PASS |
| D27 | Detail page | Tell me the story | `drama/[eventId]/page.tsx` | `tellStory()` | `narrativeLoading`, `narrative` | POST `/drama/tell-story` | request-based | PASS |
| D28 | Detail page | Open linked rivalry | `drama/[eventId]/page.tsx` | `openLinkedRivalry()` | resolving/error states | GET `/rivalries?managerAId&managerBId` then route push | dynamic drill-down | PASS |
| D29 | Detail page | Matchup context link | `drama/[eventId]/page.tsx` | `Link` | route nav | none | matchups tab handles reload | PASS |
| D30 | Detail page | Trade fallout context | `drama/[eventId]/page.tsx` | `Link` | route nav | none | trade tab reloads | PASS |
| D31 | Matchup view | Matchup drama refresh | `MatchupDramaWidget` | `load()` | loading/error/events | GET `/drama?relatedMatchupId=` | no-store | PASS |
| D32 | Matchup view | Matchup story action | `MatchupDramaWidget` | `tellStory(eventId)` | `storyByEvent` + loading | POST `/drama/tell-story` | toggle hide/show | PASS |
| D33 | Matchup view | Matchup story detail link | `MatchupDramaWidget` | `Link` | route nav | GET `/drama/[eventId]` | detail refresh available | PASS |

## Notes

- Notification-click hooks are prepared by stable event routing (`/drama/[eventId]`) and story APIs; dedicated notification UI integration can bind to these routes without backend changes.
- Rivalry-linked drill-down resolves pair-to-rivalry at click time to avoid stale cached rivalry ids.
