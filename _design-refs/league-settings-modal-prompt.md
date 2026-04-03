# Cursor Prompt — League Settings Modal (Full Build)

## Context
AllFantasy.ai — Next.js 14, Supabase auth, Sleeper API, Anthropic Claude API (Chimmy AI).
League page: `app/league/[leagueId]/LeagueShell.tsx`
Create: `app/league/[leagueId]/components/LeagueSettingsModal.tsx`

The ⚙️ gear icon in LeagueShell.tsx should open this modal. Wire it up.

---

## Modal Shell

Full-screen overlay modal, dark navy background (`#0d1117`), slide-up animation on mobile, centered on desktop.

**Header:**
- X close button top-left
- League avatar (Sleeper CDN: `https://sleepercdn.com/avatars/{league.avatar}`) — circle, 48px, initials fallback
- League name — large bold white text
- "League Settings" — small muted subtitle below name
- Two pill tabs side by side: **GENERAL** | **COMMISH**
- Only show COMMISH tab if `league.commissioner_id === currentUserId`

---

## GENERAL TAB

2-column card grid. Each card: dark card `#1a1f3a`, rounded-xl, icon (lucide-react) top-left, bold white title, muted gray description. Cards are tappable and open a slide-in sub-panel (not a new page).

---

### 1. My Team
**Icon:** `User`
**Description:** Update your team avatar, name & player nicknames

**Sub-panel content:**
- Team avatar upload (circular, uses Vercel Blob via `/api/chat/upload`)
- Team name text input — saves via Sleeper API PATCH if available, else stores in Supabase `user_team_settings` table keyed by `(user_id, league_id)`
- Player nickname table — list of rostered players with an editable nickname field next to each name. Nicknames stored in Supabase.
- Save button

---

### 2. General
**Icon:** `Settings`
**Description:** View league general settings

**Sub-panel content (read-only display, sourced from Sleeper league object):**
- League name
- Number of teams (`league.total_rosters`)
- Sport & season (`league.sport`, `league.season`)
- Scoring type (`league.scoring_settings` — detect PPR/Half-PPR/Standard)
- Waiver type (`league.settings.waiver_type` — 0=FAAB, 1=rolling)
- FAAB budget (`league.settings.waiver_budget`)
- Playoff teams (`league.settings.playoff_teams`)
- Playoff start week (`league.settings.playoff_week_start`)
- Trade deadline week (`league.settings.trade_deadline`)
- "Open full settings in Sleeper →" link: `https://sleeper.com/leagues/{leagueId}/settings`

---

### 3. Draft
**Icon:** `ClipboardList`
**Description:** View draft settings and history

**Sub-panel content:**
- Draft type (snake / linear / auction — from `draft.type`)
- Draft order type (auto/manual)
- Scheduled draft date/time (from `draft.start_time` — formatted as readable date)
- Picks per team
- Seconds per pick (`draft.settings.pick_timer`)
- "View Draft Board" button → navigates to DraftTab
- "Mock Draft" button → `https://sleeper.com/mock-draft/{leagueId}`
- Draft status badge (Scheduled / In Progress / Complete)

---

### 4. Playoffs
**Icon:** `Trophy`
**Description:** Update playoff settings

**Sub-panel content (read from Sleeper league settings):**
- Playoff bracket type
- Number of playoff teams
- Playoff start week
- Consolation bracket enabled toggle (display only)
- Toilet bowl bracket toggle (display only)
- "Open Playoff Settings in Sleeper →" deep link

---

### 5. Roster
**Icon:** `Users`
**Description:** Roster settings and position limits

**Sub-panel content:**
- Roster slot breakdown — display each position and count (QB, RB, WR, TE, FLEX, K, DEF, etc.) from `league.roster_positions`
- Total starters count
- Total bench spots
- IR slots (`league.settings.reserve_slots`)
- Taxi squad slots (`league.settings.taxi_slots`)
- "Open Roster Settings in Sleeper →" deep link

---

### 6. Scoring
**Icon:** `BarChart2`
**Description:** View scoring settings

**Sub-panel content:**
- Auto-detected scoring type badge (PPR / Half-PPR / Standard / Custom)
- Key scoring values displayed as a clean list:
  - Passing TD, Passing yards (per), Interception
  - Rushing TD, Rushing yards (per)
  - Receiving TD, Receiving yards (per), Reception
  - Bonus fields if set (300+ pass yard bonus, etc.)
- "Open Scoring Settings in Sleeper →" deep link

---

### 7. Notifications
**Icon:** `Bell`
**Description:** Customize your AllFantasy notifications

**Sub-panel content (stored in Supabase `user_notification_prefs` table, keyed by user_id + league_id):**
Toggle switches for:
- Trade offers received
- Waiver claims processed
- Injury alerts for my players
- Scoring updates during games
- Draft pick reminders
- League chat mentions
- Chimmy AI weekly recap
- Commissioner announcements

Save button — updates Supabase.

---

### 8. Invite
**Icon:** `Mail`
**Description:** Invite others to your league

**Sub-panel content:**
- League invite link (from `league.metadata.invite_code` or Sleeper invite URL) — copy-to-clipboard button
- Share via: WhatsApp, iMessage deep link, copy link buttons
- QR code generated from the invite URL (use `qrcode.react` package)
- Current member count vs total teams (e.g. "12 / 16 teams filled")

---

### 9. Manage Co-Owners
**Icon:** `UserPlus`
**Description:** Select co-owners to run your team

**Sub-panel content:**
- List of current league members with their avatar + display name
- Toggle next to each to assign as co-owner for your team
- Co-owner assignments stored in Supabase `team_co_owners` table
- Info note: "Co-owners can manage your team when you're unavailable"

---

### 10. Draft Results
**Icon:** `Grid`
**Description:** View draft results for this league

**Sub-panel content:**
- Fetches draft picks from Sleeper `/draft/{draft_id}/picks`
- Renders a pick grid: rounds × teams
- Each cell shows player name + position + team
- Highlight current user's picks in accent color
- "Export as CSV" button

---

### 11. League History
**Icon:** `BookOpen`
**Description:** League history and past champions

**Sub-panel content:**
- Fetches from Sleeper `/league/{leagueId}/previous_league_id` chain
- Renders a timeline of past seasons:
  - Season year
  - Champion team name + avatar
  - Runner-up
  - Regular season record of winner
- "Add Trophy" button (commissioner only) — stores custom trophy/note in Supabase `league_history` table

---

## COMMISH TAB

Same card grid layout, commissioner-only. Only visible if `league.commissioner_id === currentUserId`. Cards open slide-in sub-panels.

---

### 1. General Settings (Commish)
**Icon:** `Star`
**Description:** Update league general settings

**Sub-panel content:**
- League name edit field (updates Supabase + shows note to also update in Sleeper)
- Public / Private league toggle (stored in Supabase)
- League description / tagline (stored in Supabase `league_meta` table)
- League logo upload — Vercel Blob, stored URL in Supabase
- "Open in Sleeper Commissioner Tools →" deep link

---

### 2. Division Settings
**Icon:** `Zap`
**Description:** Update division settings

**Sub-panel content:**
- Division names (editable, stored in Supabase `league_divisions`)
- Team assignments per division — drag-and-drop or dropdown per team
- Number of divisions toggle (1 / 2 / 4)
- "Open Division Settings in Sleeper →" deep link

---

### 3. Members
**Icon:** `MessageSquare`
**Description:** Manage league members

**Sub-panel content:**
- Full member list: avatar + display name + team name + join date
- Each member row has:
  - "Remove from league" button (commissioner only, opens confirm dialog)
  - "Reset team" button
  - Co-owner badge if assigned
- Pending invite slots shown at bottom

---

### 4. Commish Note
**Icon:** `FileText`
**Description:** Add or update commissioner notes

**Sub-panel content:**
- Rich text area for commissioner note (stored in Supabase `commish_notes` table keyed by league_id)
- Note is visible to all league members in the League tab
- **AI FEATURE — "✨ Generate with Chimmy" button:**
  - Calls `/api/ai/commish-note` endpoint
  - Sends league context (week number, top scorers, injury news, standings) to Claude
  - Returns a ready-to-post commissioner note
  - User can edit before saving
- Post / Update button

---

### 5. Commish Controls
**Icon:** `Shield`
**Description:** Commissioner league controls

**Sub-panel content:**
- Force waiver claim: assign any player to any team
- Reset draft order button (confirm dialog)
- Add/remove IR exception for a player
- Pause/resume waivers toggle
- Manual score override (text input: team + points)
- All actions logged to Supabase `commish_actions` audit table

---

### 6. Draft Results (Commish view)
**Icon:** `Grid`
**Description:** Manage draft results

**Sub-panel content:**
- Same as General tab Draft Results
- Plus: "Edit pick" option per cell (override a pick result, stored in Supabase)
- Export full draft board as CSV or image

---

### 7. League History (Commish)
**Icon:** `BookOpen`
**Description:** Update league history

- Same as General tab
- Plus: edit/delete past champion entries
- Add custom season notes

---

## AI FEATURES TAB (new 3rd tab — "AI ✨")

Add a third pill tab: **AI ✨** — visible to all members.

2-column card grid, same style. Accent color: purple/violet gradient on cards to distinguish from standard settings.

---

### 1. Chimmy League Setup
**Icon:** `Bot`
**Description:** Configure Chimmy for this league

**Sub-panel content:**
- Chimmy nickname for this league (e.g. "Chimaera" — stored in Supabase)
- Chimmy personality mode: dropdown (Hype Man / Analyst / Trash Talker / Balanced)
- Auto-post weekly recap toggle — Chimmy posts a recap to league chat every Tuesday
- Auto injury alerts toggle — Chimmy posts when a starter on any team gets injured
- Chimmy responds to @mentions in chat toggle
- Save button

---

### 2. AI Power Rankings
**Icon:** `TrendingUp`
**Description:** Weekly AI-generated power rankings

**Sub-panel content:**
- Fetches current rosters + recent scores
- Calls `/api/ai/power-rankings?leagueId=...`
- Claude ranks all teams 1–N with a one-sentence explanation per team
- Displays as ranked list with team avatar + rank badge + blurb
- "Post to League Chat" button (commissioner only)
- Refreshes weekly (cached in Supabase with TTL)

---

### 3. AI Trade Analyzer
**Icon:** `ArrowLeftRight`
**Description:** Analyze any trade with AI

**Sub-panel content:**
- Two-column trade builder: "You Give" / "You Get" player selectors
- Player search with autocomplete from rostered players
- "Analyze Trade" button → calls `/api/ai/trade-analysis`
- Claude returns:
  - Overall verdict (Win / Loss / Fair)
  - Short-term vs long-term breakdown
  - Player value comparison
  - Recommendation
- Shareable trade analysis card

---

### 4. AI Waiver Wire
**Icon:** `Shuffle`
**Description:** AI waiver wire recommendations

**Sub-panel content:**
- Calls `/api/ai/waiver-recs?leagueId=...&userId=...`
- Claude analyzes: user's roster weaknesses + available players on waivers + upcoming matchups
- Returns top 5 pickup recommendations with reasoning
- Each rec shows: player name, position, team, why to add, who to drop
- "Add to Watch List" button per player (stored in Supabase)

---

### 5. AI Weekly Recap
**Icon:** `Newspaper`
**Description:** AI-generated league recap

**Sub-panel content:**
- Auto-generated each week after games complete
- Calls `/api/ai/weekly-recap?leagueId=...&week=...`
- Claude generates a sports-column-style recap including:
  - Game of the week
  - Biggest win/loss
  - Top performer
  - Biggest bust
  - Injury impact
  - Power shift storyline
- "Post to Chat" button
- Archive of past week recaps

---

### 6. AI Draft Assistant
**Icon:** `ClipboardList`
**Description:** Chimmy-powered draft help

**Sub-panel content:**
- Pre-draft: "Build My Draft Strategy" — Claude analyzes league scoring settings + roster needs + ADP data and returns a personalized draft strategy
- During draft: auto-activates on Draft tab — shows AI pick recommendations in real time
- Post-draft: "Grade My Draft" — Claude grades each pick A–F with reasoning
- "Export Draft Report" button → generates shareable PDF-style recap

---

### 7. AI Matchup Preview
**Icon:** `Swords`
**Description:** Weekly matchup analysis

**Sub-panel content:**
- Calls `/api/ai/matchup-preview?leagueId=...&week=...&userId=...`
- Claude analyzes: user's projected lineup vs opponent's projected lineup
- Returns:
  - Win probability percentage (with confidence bar)
  - Key player matchups to watch
  - Optimal lineup recommendation
  - One paragraph narrative preview
- Refreshes each week

---

### 8. AI Trash Talk
**Icon:** `MessageCircle`
**Description:** Generate trash talk for your league chat

**Sub-panel content:**
- Dropdown: select a league member to target
- Intensity slider: Mild / Medium / Savage
- "Generate" button → calls `/api/ai/trash-talk`
- Claude generates a personalized trash talk message based on the target's recent performance
- "Post to Chat" button
- Disclaimer: "Keep it fun 🏆"

---

## Implementation Notes for Cursor

- All Sleeper data reads from the league object already loaded in `LeagueShell.tsx` — no new Sleeper fetches needed except for `/league/{leagueId}/users` (members) and `/draft/{draft_id}/picks` (draft results)
- All AI endpoints should be created under `app/api/ai/` — each one calls `anthropic.messages.create` with league context injected into the system prompt
- All user preferences and custom data store in Supabase — create tables as needed with `npx prisma migrate dev`
- Sub-panels should slide in from the right over the modal (not replace it) with a back arrow to return to the card grid
- Use `lucide-react` for all icons
- Modal should be fully responsive — full screen on mobile, max-w-2xl centered on desktop
- Persist last-open tab (GENERAL/COMMISH/AI) in localStorage per leagueId
