## Waiver Wire UX Audit

### Existing pieces

- `components/app/tabs/WaiversTab.tsx`:
  - Uses `useLeagueSectionData(leagueId, 'waivers')` to hit `/api/app/league/[leagueId]/waivers`, which proxies to `/api/waiver-ai`.
  - Renders:
    - `TabDataState` with raw AI JSON via `SmartDataView`.
    - `LegacyAIPanel` for legacy waiver engine.
  - No interactive claim UX; AI is read-only.

- `components/waiver-wire/WaiverWirePage.tsx`:
  - New basic page that:
    - Fetches waiver settings, available players, pending claims, processed history, and roster via:
      - `/api/waiver-wire/leagues/[leagueId]/settings`
      - `/api/waiver-wire/leagues/[leagueId]/claims`
      - `/api/waiver-wire/leagues/[leagueId]/players`
      - `/api/league/roster`
    - Shows:
      - Simple “Submit claim” form with:
        - Add player ID
        - Drop player ID
        - FAAB bid (if FAAB)
      - Tabs: “Available”, “Pending”, “Processed history”.
      - FAAB badge and league waiver settings summary.
  - Gaps vs requirements:
    - No per-player “Add claim” button/card.
    - No claim modal / bottom sheet.
    - No filters (position/status/team) or sort.
    - No inline AI suggestion cards – AI lives in a separate panel.

- Data sources:
  - Roster: `/api/league/roster?leagueId=...` returns `roster.playerData` (string IDs or `{ players: string[] }`) and `faabRemaining`.
  - Available players: `/api/waiver-wire/leagues/[leagueId]/players` returns `{ id, name, position, team }`.
  - Waiver AI: `/api/waiver-ai` (via `/api/app/league/[leagueId]/waivers` and `.../waivers/ai-advice`).

### UX gaps vs Sleeper-style goal

- **Browsing & discovery**
  - Player list is a simple table of IDs; no visual card, trend, or rostered %.
  - No search box on the page, only a generic `q` param in the backend.
  - No position/status/team filters or sort controls.

- **Claim creation**
  - Claims are created via a generic form at the top, not from each player row.
  - No modal/drawer flow; drop player must be typed by ID.
  - Claim priority is implicit (priorityOrder) and not user-visible/editable in UI.

- **Pending / processed visibility**
  - Pending list shows add/drop IDs and FAAB; acceptable but not rich (no player name, team, or position).
  - Processed history shows add/drop IDs and FAAB only.

- **AI integration**
  - AI suggestions are shown as a JSON/data panel (`SmartDataView`) separate from the main waiver UX.
  - No inline “AI recommended” badges or card-level copy.

- **Mobile**
  - Layout uses desktop-style cards; no explicit bottom sheet or sticky filter bar.
  - Claim flow is not optimized for small screens.

### UX goals for new implementation

- Maintain existing data flows and AI endpoints:
  - Use `/api/waiver-wire/...` for claims/settings/players.
  - Use `/api/app/leagues/[leagueId]/waivers/ai-advice` and `/api/waiver-ai` for recommendation surfaces.
- Add a **Sleeper-style** waiver page:
  - Sticky filter/search bar with:
    - Search field
    - Position chips (QB/RB/WR/TE/Flex for NFL; generic for other sports)
    - Status filter (All / Available / On watchlist placeholder)
    - Sort dropdown (e.g., by name, position, mock “trend”).
  - Player rows as compact cards:
    - Name, position, team, status, trend stub, rostered % stub, and “Add claim” CTA.
  - Claim modal / bottom sheet:
    - Shows selected player.
    - Lets user pick a drop from current roster IDs (with future hook to player details).
    - FAAB input when league uses FAAB.
    - Claim priority numeric input.
  - Tabs for:
    - Available
    - Pending
    - Processed
  - Top-of-page badges:
    - FAAB remaining.
    - Waiver priority (if configured).
  - AI suggestions panel:
    - Summarizes suggested pickups with:
      - Player name and sport.
      - “Why suggested” copy extracted from AI JSON.
      - Short, non-guaranteeing language.

