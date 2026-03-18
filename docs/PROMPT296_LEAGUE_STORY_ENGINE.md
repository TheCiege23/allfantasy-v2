# PROMPT 296 — League Story Engine

## Objective

Create narratives around leagues and expose them as shareable, AI-generated story cards.

## Example narratives

- **“This is the closest matchup of the week”** — When two teams are within a small projected margin.
- **“Underdog story”** — Low-ranked team facing a top team; “anything can happen.”
- **“Dominant team”** — Runaway leader (wins or points) running away with the league.
- **“Rivalry of the week”** — Spotlight on a marquee matchup.
- **“Don’t count them out”** — Team trending up / comeback trajectory.
- **“League spotlight”** — Default when no specific angle is detected.

## Shareable output

- **AI-generated story card**: fixed-size image card (600×400) with league name, week/sport, story title, narrative body, optional highlight line, and AllFantasy branding. Suitable for html2canvas capture and share.

## Deliverable: Story engine

### Engine (lib/league-story-engine/)

- **types.ts** — `LeagueStoryType`, `LeagueStoryContext` (leagueId, leagueName, week, standings, matchups), `LeagueStoryPayload` (storyType, title, narrative, highlight, …).
- **templates.ts** — Title and narrative template per story type; `fillTemplate(template, vars)` with placeholders `{leagueName}`, `{week}`, `{team1}`, `{team2}`, `{teamName}`, `{highlight}`.
- **StoryEngine.ts** — `selectStoryType(ctx)`: picks a story type from context (e.g. closest matchup by margin, underdog when low rank vs top, dominant when wins/PF gap is large). `buildStoryPayload(ctx, options?)`: builds payload with optional `storyType`, `customTitle`, `customNarrative`.
- **shareUrls.ts** — Build share intent URLs and copy text for X, Reddit, Instagram, Discord.

### Card and share UI (components/league-story/)

- **LeagueStoryCard.tsx** — Renders the story card (id for capture), league name, week/sport, title, highlight, narrative, AllFantasy footer.
- **LeagueStoryShareBar.tsx** — Download image, Copy link, Share to X/Reddit, Copy for Instagram/Discord.
- **LeagueStoryModal.tsx** — Preview card + “Create share link”; on success shows card + share bar. Optional `initialPayload` for pre-built story.
- **LeagueStoryPageContent.tsx** — Share page content (card + “Try AllFantasy” CTA).

### API and share page

- **POST /api/share/league-story** — Body: `leagueId`, optional `week`, `season`, `sport`, `storyType`, `customTitle`, `customNarrative`, `standings[]`, `matchups[]`. Loads league from DB; builds context; runs `buildStoryPayload`; creates ShareableMoment (`shareType: 'league_story'`); returns `shareUrl` and `payload`.
- **Share page** — For `shareType === 'league_story'`, renders `LeagueStoryPageContent` with payload from metadata.

### Integration

- **Overview tab** — “Create league story” button opens `LeagueStoryModal` with `leagueId`, `leagueName`, `sport`, `season`. User clicks “Create share link” to get link + download/share options.

### Data flow

- With **no standings/matchups** in the request, the engine uses a minimal context and returns **league_spotlight** (generic narrative).
- With **standings** (name, wins, losses, pointsFor, rank), the engine can pick **dominant_team** or **comeback_trajectory**.
- With **matchups** (team1, team2, scores or projectedMargin), the engine can pick **closest_matchup**, **underdog_story**, or **rivalry_spotlight**.
- Callers can pass **customTitle** and **customNarrative** for fully AI-generated copy (e.g. from Chimmy or another AI) and still use the same card and share flow.

## Files

- **Engine**: `lib/league-story-engine/types.ts`, `templates.ts`, `StoryEngine.ts`, `shareUrls.ts`, `index.ts`
- **Components**: `components/league-story/LeagueStoryCard.tsx`, `LeagueStoryShareBar.tsx`, `LeagueStoryModal.tsx`, `LeagueStoryPageContent.tsx`, `index.ts`
- **API**: `app/api/share/league-story/route.ts`
- **Share page**: `app/share/[shareId]/page.tsx` (league_story branch)
- **Integration**: `components/app/tabs/OverviewTab.tsx` (Create league story button + modal)

## Summary

- **Story engine**: Narrative types (closest matchup, underdog, dominant team, rivalry, comeback, league spotlight) with template-based copy and optional custom AI copy.
- **Shareable output**: League story card (image + link) and share bar (download, copy link, X, Reddit, Instagram, Discord).
- **Entry point**: League overview “Create league story” → modal → create link → share.
