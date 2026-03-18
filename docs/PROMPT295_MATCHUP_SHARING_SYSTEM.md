# PROMPT 295 — Matchup Sharing System

## Objective

Let users share matchups with projected winner, score prediction, and key players.

## Included on the card

- **Projected winner** — Which team is favored (by projected score).
- **Score prediction** — Projected score for each team (e.g. 112.4 – 108.2).
- **Key players** — Optional list of player names to highlight (e.g. Josh Allen, CeeDee Lamb).

Win probability for the projected winner is shown when available.

## Deliverable: Matchup share UI

### Flow

1. User runs a **matchup simulation** (or views a matchup elsewhere).
2. User clicks **Share matchup**.
3. A **modal** opens with:
   - Optional **Key players** field (comma-separated).
   - **Preview** of the share card (team names, projected winner, scores, key players, AllFantasy branding).
   - **Create share link** button.
4. After creating the link:
   - **Share bar** appears: **Download image**, **Copy link**, **Share to X**, **Share to Reddit**, **Copy for Instagram**, **Copy for Discord**.
   - The share URL points to `/share/{id}` (link back to app); the share page renders the same card and a “Try AllFantasy” CTA.

### Files

- **Types**: `lib/matchup-sharing/types.ts` — `MatchupSharePayload` (team names, projected winner, scores, winProbability, keyPlayers, sport, weekOrRound).
- **Share URLs**: `lib/matchup-sharing/shareUrls.ts` — X, Reddit intents and copy text for Instagram/Discord.
- **Components**:  
  - `components/matchup-sharing/MatchupShareCard.tsx` — Renders the image card (600×400, capture id for html2canvas).  
  - `components/matchup-sharing/MatchupShareBar.tsx` — Download image, copy link, share to X/Reddit, copy for Instagram/Discord.  
  - `components/matchup-sharing/MatchupShareModal.tsx` — Preview, key players input, create link, then card + share bar.  
  - `components/matchup-sharing/MatchupSharePageContent.tsx` — Share page content (card + CTA).
- **API**: `app/api/share/matchup/route.ts` — POST with team names, projected scores, win probabilities, optional keyPlayers/sport/weekOrRound; creates ShareableMoment (`shareType: 'matchup_share'`), returns shareUrl and payload.
- **Share page**: `app/share/[shareId]/page.tsx` — For `shareType === 'matchup_share'`, renders `MatchupSharePageContent` with payload from metadata.
- **Integration**: `components/simulation/MatchupSimulationPage.tsx` — **Share matchup** button opens `MatchupShareModal`; **Copy caption** remains for text-only share.

### Usage

- **From matchup simulation**: Run simulation → click **Share matchup** → optionally add key players → **Create share link** → use Download image and share actions.
- **Share link**: Recipients open `/share/{id}` to see the card and link back to the app.

## Summary

- **Matchup share UI**: Modal with card preview, key players input, and share bar (image + link).
- **Card content**: Projected winner, score prediction, key players, AllFantasy branding.
- **Share destinations**: Download image, copy link, X, Reddit, copy for Instagram/Discord.
