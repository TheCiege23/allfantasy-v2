# Prompt 57 — League Discovery AI (Deliverable)

## Overview

An **AI matching engine** that suggests leagues to users based on:

- **Skill level** — beginner, intermediate, advanced, expert (matched to league size and format)
- **Sports preferences** — NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER (from `lib/sport-scope.ts`)
- **League activity** — quiet, moderate, active (chat/trades)
- **Competition balance** — casual, balanced, competitive

The engine scores candidate leagues heuristically, then uses OpenAI to generate a short summary and 1–3 reasons per suggestion.

## Data flow

1. **Input**: User preferences (skill, sports, activity, competition) + candidate leagues.
2. **Candidates** come from either:
   - **Public pools** — when `tournamentId` is provided, the API fetches public bracket leagues for that tournament and converts them to candidates.
   - **Discovered leagues** — client passes a `candidates` array (e.g. from Sleeper discover); the UI can first call `/api/league/discover` (Sleeper username), then call suggest with those leagues as candidates.
3. **Scoring**: Each league is scored 0–100 using sport match, skill vs size, activity match, and competition balance match.
4. **AI**: Top 10 scored leagues are sent to OpenAI to get a `summary` and `reasons[]` per league; results are merged back.

## API

- **POST** `/api/league/discovery/suggest`
  - Auth: session required.
  - Body: `{ preferences: UserDiscoveryPreferences, candidates?: CandidateLeague[], tournamentId?: string }`.
  - If `tournamentId` is set, candidates are loaded from public bracket pools and `candidates` is ignored. Otherwise `candidates` must be provided.
  - Returns: `{ suggestions: LeagueMatchSuggestion[], generatedAt: string }`.

## UI

- **Discover page**: `/app/discover` — preferences form (skill, sports, activity, competition), source selector (Public pools vs My discovered leagues), tournament ID input or Sleeper discover flow, then “Get suggestions” with ranked results (match %, summary, reasons).
- **Home**: “League Discovery” link on `/app` home points to `/app/discover`.

## Files

| Area     | Path |
|----------|------|
| Types    | `lib/league-discovery/types.ts` |
| Service  | `lib/league-discovery/LeagueDiscoveryService.ts` |
| Index    | `lib/league-discovery/index.ts` |
| API      | `app/api/league/discovery/suggest/route.ts` |
| UI       | `components/league-discovery/LeagueDiscoverySuggest.tsx` |
| Page     | `app/app/discover/page.tsx` |
| Home link| `app/app/home/page.tsx` |

## Sport scope

- Sports options in the UI use `SUPPORTED_SPORTS` from `lib/sport-scope.ts`.
- League sport is normalized with `normalizeToSupportedSport` when scoring; sport match uses the same set (NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER).
