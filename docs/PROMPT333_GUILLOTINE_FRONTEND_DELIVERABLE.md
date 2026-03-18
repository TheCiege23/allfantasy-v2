# PROMPT 333 — Guillotine League Frontend Deliverable

## 1. Route Updates

- **app/app/league/[leagueId]/page.tsx** [UPDATED]  
  - Fetches league detail from `GET /api/leagues/[leagueId]` for `leagueVariant` and name.  
  - When `leagueVariant === 'guillotine'`: renders `GuillotineFirstEntryModal` (first-entry video) and passes `isGuillotine` to `OverviewTab`.  
  - Overview tab content is conditional on `isGuillotine`.

- **app/app/league/[leagueId]/draft-results/page.tsx** [UPDATED]  
  - Passes `isGuillotine` to `DraftResultsClient` (from `league.leagueVariant`).  
  - Post-draft intro video is shown only for guillotine leagues.

- **app/api/leagues/[leagueId]/route.ts** [UPDATED]  
  - GET response now includes `leagueVariant` and `avatarUrl`.

- **app/api/leagues/[leagueId]/guillotine/summary/route.ts** [NEW]  
  - GET: returns guillotine home summary (survival standings, danger tiers, chopped history, config, assets).  
  - Query: `?week=1` (optional).  
  - Returns 404 when league is not a guillotine league.

- **app/api/league/create/route.ts** [UPDATED]  
  - When `leagueVariant === 'guillotine'`, sets `avatarUrl: '/guillotine/Guillotine.png'` on league create.

No new top-level routes. Existing league and draft-results routes are extended.

---

## 2. Component Tree Summary

```
app/app/league/[leagueId]/page.tsx
├── GuillotineFirstEntryModal (when isGuillotine)
├── LiveScoringWidget
└── LeagueShell
    └── LeagueTabNav
    └── renderTab(Overview) → OverviewTab(leagueId, isGuillotine)
                              ├── [if isGuillotine] GuillotineHome(leagueId)
                              │   ├── GuillotineChopAnimation (replay from state)
                              │   ├── Branding header (Guillotine.png)
                              │   ├── Quick links (Chat, Settings, AI, Waivers)
                              │   ├── Survival Board (Chop Zone, Danger, Safe, standings)
                              │   ├── Chopped History (recentChopEvents + Replay animation)
                              │   ├── Waiver & FAAB
                              │   ├── Guillotine AI panel (link to Intelligence)
                              │   └── Rules & Settings
                              └── [else] default overview (ShareLeagueLinkCard, metrics, Drama, SmartDataView)

app/app/league/[leagueId]/draft-results/page.tsx
└── DraftResultsClient(leagueId, leagueName, sport, isGuillotine)
    ├── … draft results (rankings, recap)
    └── [if isGuillotine] GuillotinePostDraftIntro(leagueId, onContinue)
```

**New components (all under `components/guillotine/`):**

- **GuillotineFirstEntryModal** — First-entry video modal (Guillotine.mp4). Skip / Replay. Visibility driven by `show` prop and localStorage `guillotine_intro_seen_{leagueId}`.
- **GuillotinePostDraftIntro** — Post-draft intro block (Guillotine League Intro.mp4). Shown after draft rankings; Continue dismisses. Uses localStorage `guillotine_post_draft_intro_seen_{leagueId}`.
- **GuillotineHome** — Full guillotine league home: branding, Survival Board, Chopped History, Waiver, AI panel, Settings. Fetches `GET /api/leagues/[leagueId]/guillotine/summary?week=…`.
- **GuillotineChopAnimation** — Chop animation (CSS keyframe). Triggered by `play` prop; optional `displayName`; `onComplete` callback. Replayable from Chopped History.

---

## 3. Media Handling Notes

- **Asset paths (guillotine only)**  
  - League image: `/guillotine/Guillotine.png` (served from `public/guillotine/Guillotine.png`).  
  - First-entry video: `/guillotine/Guillotine.mp4`.  
  - Post-draft intro video: `/guillotine/Guillotine League Intro.mp4` (URL-encoded as `Guillotine%20League%20Intro.mp4` in code).

- **Where to put files**  
  Copy into `public/guillotine/` (e.g. from `/mnt/data/` or user Downloads). See `public/guillotine/README.md`.

- **First-entry video**  
  - Shown when user lands on a guillotine league and has not seen it before (localStorage).  
  - Skip marks as seen and closes modal.  
  - Replay restarts the video without marking seen (modal stays open).  
  - After first close, modal does not show again unless `forceReplay` is used (e.g. from a “Watch again” link).

- **Post-draft intro**  
  - Rendered on draft-results page after AI draft rankings and before “Draft board recap”.  
  - Shown only once per league (localStorage).  
  - Continue marks as seen and hides the section.

- **Chop animation**  
  - CSS-only (`@keyframes guillotine-chop` in `app/globals.css`).  
  - No video; runs in main thread but short (1.2s).  
  - `reducedMotion` prop skips animation and calls `onComplete` immediately.

---

## 4. QA Checklist (Mandatory Click Audit)

- [ ] **Intro video** — Enter a guillotine league for the first time; modal with Guillotine.mp4 appears.  
- [ ] **Skip** — Click Skip; modal closes and does not reappear on refresh (localStorage set).  
- [ ] **Replay** — With modal open, click Replay; video restarts.  
- [ ] **Post-draft intro** — Complete a draft for a guillotine league; open draft results. Draft rankings appear first, then “Guillotine League Intro” section with video.  
- [ ] **Post-draft Continue** — Click Continue; section hides and does not reappear on revisit (localStorage set).  
- [ ] **Standings** — On guillotine Overview, Survival Board shows; survival standings and Chop Zone / Danger / Safe update when summary API returns data.  
- [ ] **Danger line** — Danger tier and Chop Zone reflect `dangerTiers` from summary (and danger margin).  
- [ ] **Chopped history** — Chopped History section lists recent chop events; “Replay animation” opens chop animation.  
- [ ] **Chat** — “Chat” link goes to `?tab=Chat`; league chat opens.  
- [ ] **AI tools** — “AI Tools” / “Intelligence tab” links open Intelligence tab.  
- [ ] **Mobile layout** — Guillotine home and modals are usable on small viewports (flex-wrap, responsive padding).  
- [ ] **Desktop layout** — Same content and links work on large viewports.  
- [ ] **No dead animation buttons** — “Replay animation” in Chopped History triggers animation once per click.  
- [ ] **No dead media controls** — Video elements have working controls (play/pause, volume, etc.).  
- [ ] **League creation** — Create a league with format/variant guillotine; league record has `avatarUrl: '/guillotine/Guillotine.png'`.  
- [ ] **Non-guillotine unchanged** — League with other variant still shows default Overview (no guillotine modal, no GuillotineHome).

---

## 5. File Manifest

| Label   | Relative path |
|--------|----------------|
| [UPDATED] | app/app/league/[leagueId]/page.tsx |
| [UPDATED] | app/app/league/[leagueId]/draft-results/page.tsx |
| [UPDATED] | app/api/leagues/[leagueId]/route.ts |
| [UPDATED] | app/api/league/create/route.ts |
| [NEW]   | app/api/leagues/[leagueId]/guillotine/summary/route.ts |
| [UPDATED] | components/app/draft-results/DraftResultsClient.tsx |
| [UPDATED] | components/app/tabs/OverviewTab.tsx |
| [NEW]   | components/guillotine/GuillotineFirstEntryModal.tsx |
| [NEW]   | components/guillotine/GuillotinePostDraftIntro.tsx |
| [NEW]   | components/guillotine/GuillotineHome.tsx |
| [NEW]   | components/guillotine/GuillotineChopAnimation.tsx |
| [NEW]   | components/guillotine/index.ts |
| [UPDATED] | app/globals.css (guillotine-chop keyframes) |
| [NEW]   | public/guillotine/README.md |
| [NEW]   | docs/PROMPT333_GUILLOTINE_FRONTEND_DELIVERABLE.md |
