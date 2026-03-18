# PROMPT 276 — Social and Viral Features

**Objective:** Increase user growth organically via share league link, invite system, referral tracking, share draft/matchup results, and AI-generated social posts.

---

## Delivered Features

### 1. Share league link
- **Where:** League **Overview** tab (commissioners only).
- **Component:** `components/social/ShareLeagueLinkCard.tsx`.
- **Behavior:** Fetches join URL from `GET /api/commissioner/leagues/[leagueId]/invite`; shows Copy and (when available) native **Share** button. Card only renders when the user is commissioner (API returns 403 otherwise).
- **Existing:** Commissioner tab and Settings → Privacy & invites already had invite link + copy/regenerate; this adds a visible “Share league” card on Overview for quick access.

### 2. Invite system
- **Existing:** League invite via join code (`/join?code=...`), commissioner invite link, username/email invite in Commissioner tab (`LeagueRecruitmentTools`), and creator invites.
- **Dashboard:** **“Invite & earn”** card on `/app/home` links to `/referrals` (referral link, invite friends, track rewards). Footer also has “Referrals” link.

### 3. Referral tracking
- **Existing:** `/api/referral/link`, `/api/referral/stats`, `/api/referral/progress`, `/api/referral/leaderboard`, `/api/referral/rewards`, `/api/referral/track-click`; `/referrals` page with `ReferralDashboard` and `InviteManagementPanel`.
- **Added:** **Your referral link** block on `/referrals`: fetches `GET /api/referral/link`, shows link and a **Copy link** button for one-click copy. Dashboard card **“Invite & earn”** → `/referrals` for discovery.

### 4. Share draft results
- **Where:** **Mock draft recap** (after completing a mock).
- **Component:** `components/mock-draft/MockDraftRecap.tsx`.
- **Behavior:** New prop `leagueId` (from config or first user league). **“Share results”** button calls `POST /api/mock-draft/share` with `leagueId` and `results`, then shows the share URL and **Copy** button. Share link format: `/mock-draft/share/[shareId]`.
- **Wrapper:** `MockDraftSimulatorWrapper` passes `leagueId={config?.leagueId ?? leagues[0]?.id ?? null}` into recap.

### 5. Share matchup results
- **Where:** **Matchup simulation** page (`/app/matchup-simulation`), after a result is shown.
- **Component:** `components/simulation/MatchupSimulationPage.tsx`.
- **Behavior:** **“Share result”** button calls `POST /api/share/generate-copy` with `shareType: 'winning_matchup'` and matchup context (team names, score, sport); copies AI/template caption to clipboard and shows “Copied to clipboard” feedback. Uses existing share copy API (Grok when configured, else template).

### 6. AI-generated social posts
- **Existing:** `/app/share-achievements` with share types (winning matchup, rivalry win, great trade, etc.), `POST /api/share/generate-copy`, `POST /api/share/moment` for shareable links.
- **Dashboard:** **“Create AI post”** card on `/app/home` links to `/app/share-achievements` (“Share wins, matchups, draft results”). Footer “Share” link as well.

---

## File Summary

| File | Change |
|------|--------|
| `components/social/ShareLeagueLinkCard.tsx` | **New** — Share league link card (commissioner-only). |
| `components/app/tabs/OverviewTab.tsx` | Render `ShareLeagueLinkCard` at top of Overview. |
| `components/dashboard/FinalDashboardClient.tsx` | “Invite & earn” and “Create AI post” cards in social section; footer Referrals + Share links. |
| `components/mock-draft/MockDraftRecap.tsx` | Added `leagueId` prop, “Share results” button, share URL + Copy. |
| `components/mock-draft/MockDraftSimulatorWrapper.tsx` | Pass `leagueId` into `MockDraftRecap`. |
| `components/simulation/MatchupSimulationPage.tsx` | Added “Share result” button and `shareMatchupResult` (generate-copy + copy). |
| `components/invite/ReferralDashboard.tsx` | Added “Your referral link” section with Copy button. |

---

## User Flows

1. **Share league:** Open league → Overview → (if commissioner) see “Share league” → Copy or Share join link.
2. **Invite & referral:** Dashboard → “Invite & earn” → `/referrals` → copy referral link or create invite links; track stats.
3. **Share draft:** Complete mock draft → Recap → “Share results” (when leagueId available) → copy share link.
4. **Share matchup:** Run matchup simulation → “Share result” → caption copied to clipboard for social posts.
5. **AI post:** Dashboard → “Create AI post” → `/app/share-achievements` → pick type, generate copy, copy or create moment link.
