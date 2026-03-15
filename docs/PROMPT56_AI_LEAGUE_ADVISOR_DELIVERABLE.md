# Prompt 56 — AI League Advisor (Deliverable)

## Overview

A **personal AI advisor** that monitors a user’s leagues and gives advice in four areas:

- **Lineup help** — start/sit, position upgrades, bye/injury fill-ins
- **Trade suggestions** — buy-low, sell-high, or hold with specific targets
- **Waiver alerts** — top waiver targets, drop candidates, FAAB/priority hints
- **Injury alerts** — reactions to roster injuries (bench, IR, replace)

The advisor uses the current user’s roster and league context (from the app’s League/Roster data), plus injury data from `SportsInjury`, and calls OpenAI to produce structured, actionable advice.

## Data sources

- **League** — `League` (id, name, sport) for the authenticated user
- **Roster** — `Roster` (playerData, faabRemaining, waiverPriority) for that league and user
- **Player names** — NFL: Sleeper `/players/nfl`; other sports: `PlayerIdentityMap` by sleeperId when available
- **Injuries** — `SportsInjury` filtered by league sport and roster player names (last 7 days)

Sport is normalized via `lib/sport-scope.ts` (`normalizeToSupportedSport`, `SUPPORTED_SPORTS`) so the advisor is multi-sport aware (NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER).

## API

- **GET** `/api/leagues/[leagueId]/advisor`
  - Auth: session required
  - Returns: `LeagueAdvisorAdvice` (lineup, trade, waiver, injury arrays, generatedAt, leagueId, sport)
  - 404 if league/roster not found or user does not own the league

## UI

- **Advisor** tab on the app league page (`/app/league/[leagueId]`).
- Tab label: **Advisor** in `LeagueTabNav`.
- **AdvisorTab** component:
  - Fetches `/api/leagues/{leagueId}/advisor`
  - Renders four sections: Lineup help, Trade suggestions, Waiver alerts, Injury alerts
  - Each item shows priority (high/medium/low) and summary; category-specific fields (e.g. addTarget, dropCandidate, playerName, suggestedAction) when present.
  - Reload and loading/error state via `TabDataState`.

## Files

| Area        | Path |
|------------|------|
| Types      | `lib/league-advisor/types.ts` |
| Service    | `lib/league-advisor/LeagueAdvisorService.ts` |
| Index      | `lib/league-advisor/index.ts` |
| API        | `app/api/leagues/[leagueId]/advisor/route.ts` |
| Tab UI     | `components/app/tabs/AdvisorTab.tsx` |
| Nav + Page | `components/app/LeagueTabNav.tsx`, `app/app/league/[leagueId]/page.tsx` |

## Sport scope

- Uses `normalizeToSupportedSport(league.sport)` and passes sport into injury fetch and AI context.
- Player name resolution: NFL via Sleeper; other sports via `PlayerIdentityMap` when available, else placeholder IDs.
