# PROMPT 292 — Referral System Deliverable

**Objective:** Allow users to invite others and track growth.  
**Scope:** Unique referral links, invite via SMS/email/copy, tracking (who invited who, league source, conversion), optional non-monetary perks.  
**Date:** 2025-03-17

---

## 1. Features

### 1.1 Unique referral links

- **API:** `GET /api/referral/link` — returns `{ ok, code, link }`. Link = `{baseUrl}/?ref={code}`. Code is unique per user (ReferralCode table).
- **Service:** `lib/referral` — `getOrCreateReferralCode(userId)`, `buildReferralLink(code, baseUrl)`.
- **Tracking:** When a visitor lands with `?ref=CODE`, `ReferralTracker` (or track-click API) records click and sets `af_ref` cookie; on signup we attribute and grant reward.

### 1.2 Invite via SMS, email, copy link

- **Share channels:** Copy link, SMS, Email, X (Twitter). Implemented in `ReferralShareBar` using `buildInviteShareUrl(link, channel, { message })` from `lib/invite-engine/shareUrls`.
- **Where used:**
  - **Settings → Referrals:** `ReferralSection` shows referral code + link + **ReferralShareBar** (Copy, SMS, Email, X).
  - **/referrals page:** `ReferralDashboard` shows referral link + copy button + **ReferralShareBar**.
- **Share tracking:** `POST /api/referral/share` with body `{ channel }` records a referral share event (ReferralEvent type `share`, metadata `{ channel }`) for analytics.

### 1.3 Tracking

| What | How |
|------|-----|
| **Who invited who** | `GET /api/referral/referred` returns list of users this referrer brought in: `{ referredUserId, displayName, createdAt }[]`. Shown in ReferralDashboard as “Who you invited”. |
| **League source** | Growth attribution (PROMPT 291): `GrowthAttribution` stores `source` = `referral` | `league_invite` | etc. Referral signups get `recordAttribution(userId, 'referral', { sourceId: referrerId })`. |
| **Conversion** | ReferralEvent `type: 'signup'` = conversion. Stats: `GET /api/referral/stats` returns `{ clicks, signups, pendingRewards, redeemedRewards }`. |

### 1.4 Referral perks (optional, non-monetary)

- **Existing:** `ReferralReward` — granted on signup (`grantRewardForSignup`), list via `GET /api/referral/rewards`, redeem via `POST /api/referral/rewards/redeem`. Labels from `getRewardLabel` (e.g. “Referred a join”).
- **UI:** Settings → Referrals shows pending/redeemed rewards and a “Redeem” button per pending reward. Non-monetary perks can be represented as reward types/labels in the backend (e.g. badge, early access) without code change.

---

## 2. UI summary

| Location | Content |
|----------|--------|
| **/referrals** | ReferralDashboard: referral link + copy + ReferralShareBar (Copy, SMS, Email, X); invite stats (links created, accepted); “Who you invited” list (from GET /api/referral/referred); recent invite events; “Create invite link” modal (InviteLink type referral). |
| **Settings → Referrals** | ReferralSection: referral code + link, copy code/link, ReferralShareBar; stats (clicks, signups, pending/redeemed rewards); rewards list with redeem. |
| **Layout** | ReferralTracker: on load with `?ref=`, calls track-click and sets cookie for attribution. |

---

## 3. API reference

| Endpoint | Method | Purpose |
|----------|--------|--------|
| `/api/referral/link` | GET | Get or create referral code and full link. |
| `/api/referral/stats` | GET | Clicks, signups, pending/redeemed rewards. |
| `/api/referral/referred` | GET | List of users this referrer invited (who invited who). |
| `/api/referral/share` | POST | Log share event; body `{ channel }`. |
| `/api/referral/rewards` | GET | List rewards for current user. |
| `/api/referral/rewards/redeem` | POST | Redeem a reward; body `{ rewardId }`. |
| `/api/referral/track-click` | POST | Record click and set af_ref cookie; body `{ code }`. |

---

## 4. File reference

| Path | Purpose |
|------|--------|
| `lib/referral/ReferralService.ts` | getOrCreateReferralCode, buildReferralLink, recordClick, **recordShare**, attributeSignup, getReferralStats, **getReferredUsers** |
| `lib/referral/index.ts` | Re-exports including recordShare, getReferredUsers |
| `app/api/referral/share/route.ts` | POST — log share channel |
| `app/api/referral/referred/route.ts` | GET — who you invited |
| `components/referral/ReferralShareBar.tsx` | Copy, SMS, Email, X share buttons; calls /api/referral/share |
| `components/invite/ReferralDashboard.tsx` | Referral link + ReferralShareBar + “Who you invited” + stats |
| `components/settings/ReferralSection.tsx` | Code + link + ReferralShareBar, stats, rewards; sets code from API |
| `app/referrals/page.tsx` | Referrals page with ReferralDashboard and InviteManagementPanel |

---

## 5. Optional follow-ups

- **More channels:** Add Discord, Reddit, WhatsApp to ReferralShareBar (buildInviteShareUrl already supports them).
- **Referral perks:** Define non-monetary reward types (e.g. “Early access to X”, “Badge”) in RewardDistributionService / getRewardLabel and surface in UI.
- **League source in referral UI:** If desired, show “Invited from league” vs “Direct referral” in “Who you invited” by joining with GrowthAttribution (source + sourceId) for referred users.
