# PROMPT 310 — Growth System QA Report

## Objective

Test growth systems: **sharing**, **referral**, **links**, and **social previews**.

---

## 1. Sharing — Verification

### 1.1 What exists

| Flow | API / route | View URL | Notes |
|------|-------------|----------|--------|
| **Mock draft share** | `POST /api/mock-draft/share` (body: `leagueId`, `results`, optional `draftId`) | `/mock-draft/share/[shareId]` | Creates/updates MockDraft with `shareId`; returns `{ shareId }`. |
| **Trade analysis share** | `POST /api/trade/share` (body: sideA, sideB, analysis) | `/trade/[id]` | Creates TradeShare; link is `/trade/{share.id}`. Expiry via `expiresAt`. |
| **Shareable moments** | Create via social/share flows | `/share/[shareId]` | ShareableMoment by id; types: draft_grade, draft_rankings, draft_winner, matchup_share, league_story, achievement types. Renders DraftSharePageContent, MatchupSharePageContent, LeagueStoryPageContent, or generic achievement card. |
| **League invite (share link)** | `GET /api/commissioner/leagues/[leagueId]/invite` | N/A (copy link) | Returns `joinUrl` (from `buildLeagueInviteUrl`). Used by `ShareLeagueLinkCard`; copy + optional native Share. |
| **Legacy share reward** | `POST /api/legacy/share-reward` | N/A | Records share for reward; opens Twitter intent. |

### 1.2 How to verify

- **Mock draft:** Run a mock draft → Share → get share link. Open link in incognito → page should show shared draft with league name, picks, rounds. No 404.
- **Trade share:** Run trade analysis in Dynasty Trade Form → Share → copy link. Open `/trade/{id}` in incognito → trade sides and analysis result should render. Expired shares should 404.
- **Shareable moments:** Create a shareable moment (draft grade, matchup, league story) → open `/share/[shareId]` → correct card type should render.
- **League invite:** As commissioner, open league settings/invite section → copy invite link. Link should be `{origin}/join?code=...` (or bracket variant). Paste in new tab → join/preview flow (see Links).

**Status:** Implemented. Verify manually: mock draft share, trade share, share moment, league invite copy/share.

---

## 2. Referral — Verification

### 2.1 What exists

| Piece | Location | Behavior |
|-------|----------|----------|
| **Referral link** | `GET /api/referral/link` (auth) | Returns `{ ok, code, link }`. Link = `{base}/?ref={code}`. |
| **Track click** | `POST /api/referral/track-click` (body `{ ref }` or query `?ref=`) | Validates code → `getReferrerIdByCode` → `recordClick(referrerId)` → sets `af_ref` cookie. |
| **Client tracker** | `ReferralTracker` in root layout | On load, if URL has `?ref=`, POSTs to track-click and sets cookie. |
| **Attribution on signup** | `POST /api/auth/register` | Reads `referralCode` from body or `af_ref` cookie → `attributeSignup(newUserId, code)` → `grantRewardForSignup(referrerId)`. |
| **Referral UI** | `/referrals`, `ReferralDashboard`, `ReferralSection` in settings | Stats (clicks, signups, rewards), copy link, share. |
| **Viral loop** | `recordAttribution(userId, "referral", { sourceId })` | Called after signup when attributed to referrer. |

### 2.2 How to verify

- **Link generation:** Log in → open Referrals page or call `GET /api/referral/link` → receive `code` and `link`. Link format: `https://allfantasy.ai/?ref=XXXXXXXXXX`.
- **Click tracking:** Open link in incognito (or with no af_ref). ReferralTracker should POST to track-click. Check: referral events table has `type: 'click'` for that referrer; response sets `af_ref` cookie.
- **Signup attribution:** With `af_ref` set (or ref in URL), complete signup. After register, referrer should see +1 signup in referral stats; referred user should be in “referred” list; reward may be granted per `grantRewardForSignup`.

**Status:** Implemented. Verify: get link → visit with ref → confirm click recorded and cookie set → signup → confirm attribution and stats.

---

## 3. Links — Verification

### 3.1 What exists

| Link type | URL pattern | Resolver / API |
|-----------|-------------|----------------|
| **Referral** | `/?ref=CODE` | Homepage; ReferralTracker records click and sets cookie. |
| **League invite (main app)** | `/join?code=XXX` | `buildLeagueInviteUrl(inviteCode)` (viral-loop). Preview: `GET /api/leagues/join/preview?code=`. Join flow uses code for attribution on signup (`af_league_invite` cookie). |
| **Bracket join** | `/brackets/join?code=XXX` | Preview: `GET /api/league-invite/preview?code=` or bracket preview. Join: `POST /api/bracket/leagues/join` with `{ joinCode }`. |
| **Trade share** | `/trade/[id]` | TradeShare by id; expires by `expiresAt`. |
| **Mock draft share** | `/mock-draft/share/[shareId]` | MockDraft by `shareId`. |
| **Share moment** | `/share/[shareId]` | ShareableMoment by id. |
| **Creator league join** | `/join?code=...` or creator-specific | `POST /api/creator-invites/join` (body `{ code }`). |

### 3.2 How to verify

- **Referral:** `https://allfantasy.ai/?ref=VALID_CODE` → 200; click recorded; cookie set.
- **League invite:** `https://allfantasy.ai/join?code=VALID_CODE` → join page loads; preview shows league name/sport if code valid; join completes and redirects or shows success.
- **Bracket join:** `https://allfantasy.ai/brackets/join?code=VALID_JOIN_CODE` → preview → submit join → redirect to league.
- **Trade share:** `https://allfantasy.ai/trade/{shareId}` → trade analysis page or 404 if expired/missing.
- **Mock draft:** `https://allfantasy.ai/mock-draft/share/{shareId}` → shared draft page or 404.
- **Share moment:** `https://allfantasy.ai/share/{shareId}` → correct moment type or 404.

**Status:** Implemented. Verify each URL pattern in browser; invalid/expired codes should 404 or show error.

---

## 4. Social Previews (OG / Twitter) — Verification

### 4.1 What exists

| Page / route | Metadata / OG |
|--------------|----------------|
| **Root** | `app/layout.tsx`: `metadata` with `openGraph` (title, description, url, siteName, type, `images: [{ url: '/og-image.jpg' }]`), `twitter` (card: summary_large_image, title, description). |
| **Mock draft share** | `app/mock-draft/share/[shareId]/page.tsx`: `generateMetadata` returns `title` and `description` only. **No** `openGraph` or `twitter` or `images` in export. |
| **Share moment** | `app/share/[shareId]/page.tsx`: **No** `generateMetadata`. Rely on root layout only. |
| **Trade share** | `app/trade/[id]/page.tsx`: **No** `generateMetadata`. Rely on root layout only. |
| **Other landings** | Many pages (discover, blog, tools-hub, fantasy-*, chimmy, etc.) set `openGraph` and often `twitter` in metadata. |
| **Helper** | `lib/seo/SocialShareMetadataService.ts`: `getOgImageUrl`, `getSocialShareConfig`, Twitter/Facebook/LinkedIn share URLs. Default OG image: `/og-image.jpg`. |

### 4.2 How to verify

- **Root:** Share `https://allfantasy.ai/` on Twitter/Facebook/Discord/Slack → preview should show title “AllFantasy – AI Powered Fantasy Sports Tools”, description, and image (e.g. `/og-image.jpg`). Use Facebook Debugger or Twitter Card Validator if needed.
- **Mock draft share:** Share `https://allfantasy.ai/mock-draft/share/{shareId}`. Currently only title/description set; **no OG image** on this page. Preview may fall back to root or show minimal card.
- **Share moment:** Share `https://allfantasy.ai/share/{shareId}`. **No page-specific OG**; crawlers see root metadata. Consider adding `generateMetadata` with title, description, and OG image for moment type.
- **Trade share:** Share `https://allfantasy.ai/trade/{id}`. **No page-specific OG**; crawlers see root metadata. Consider adding `generateMetadata` with trade-specific title/description and optional image.

### 4.3 Gaps and recommendations

- **Share pages (trade, share moment, mock draft):** Add `generateMetadata` (and optionally `openGraph`/`twitter` with `images`) so shared links render rich previews (title, description, image). Use `SocialShareMetadataService.getOgImageUrl` or a dynamic OG image for consistency.
- **Mock draft share:** Already has `generateMetadata`; add `openGraph` and `twitter` (and `images`) so cards show the same title/description and an image.

**Status:** Root and many landings render social previews. Share-specific routes (trade, share moment) rely on root; mock draft has title/description but no OG/twitter/images. Verify root and one share URL in a validator; document gaps above.

---

## 5. Summary Checklist

| Area | Verified? | Notes |
|------|-----------|--------|
| **Sharing** | Manual QA | Mock draft, trade, shareable moments, league invite copy/share. |
| **Referral** | Manual QA | Link generation, track-click + cookie, signup attribution and stats. |
| **Links** | Manual QA | ref, join?code=, brackets/join?code=, trade/[id], mock-draft/share/[id], share/[id]. |
| **Social previews** | Manual QA | Root: full OG + Twitter. Share pages: add OG/twitter/images for richer cards. |

---

## 6. Quick test script (manual)

1. **Referral:** Get link from `/referrals` → open in incognito → sign up with new account → check referrer’s referral stats for +1 signup.
2. **League invite:** As commissioner, copy invite link from league → open in incognito → confirm preview and join (or redirect to login then join).
3. **Mock draft share:** Complete mock draft → Share → open shared URL in incognito → confirm draft content.
4. **Trade share:** Share a trade analysis → open `/trade/{id}` in incognito → confirm analysis and teams.
5. **Social preview:** Paste `https://allfantasy.ai/` into Twitter Card Validator or Facebook Sharing Debugger → confirm title, description, and image.

---

## Deliverable

This document is the **Growth QA report**. It verifies that **sharing** (mock draft, trade, moments, league invite), **referral** (link, track-click, cookie, signup attribution), and **links** (ref, join, bracket join, share URLs) are implemented and how to test them, and it confirms **social previews** on the root and identifies that share-specific pages (trade, share moment, and mock draft share) would benefit from explicit Open Graph and Twitter metadata so shared links render rich previews consistently.
