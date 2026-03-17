# Prompt 106 — Referral System + Growth Incentives

## Deliverable summary

- **Referral engine:** Referral links (per-user code), click tracking, signup attribution via cookie/body, and rewards (one per referred signup) with redeem flow.
- **Core modules:** ReferralService (link, click, attribution, stats), ReferralTrackingResolver (resolve ref from request, set cookie), RewardDistributionService (grant/list/redeem).
- **UI:** Settings → Referrals tab: share referral link, copy, share to Twitter, stats (clicks, signups, pending/redeemed), list rewards with Redeem button. ReferralTracker on app layout records click and sets cookie when landing with `?ref=`.
- **QA:** End-to-end tracking verified via flow: share link → land with ref → track-click → signup (cookie/body) → attribute + grant reward → stats and redeem.

---

## 1. Referral architecture

### 1.1 Data model

| Model | Purpose |
|-------|--------|
| **ReferralCode** | One per user; unique `code` (e.g. 10-char alphanumeric); used in URL `/?ref=CODE`. |
| **ReferralEvent** | `referrerId`, optional `referredUserId`, `type` (click \| signup), `metadata`, `createdAt`. Clicks have no referredUserId; signups have referredUserId set. |
| **ReferralReward** | `userId`, `type` (e.g. referral_signup), `status` (pending \| redeemed), `grantedAt`, `redeemedAt`. One reward per attributed signup. |

### 1.2 Core modules (`lib/referral/`)

| Module | Responsibilities |
|--------|------------------|
| **ReferralService** | `getOrCreateReferralCode(userId)` → code; `buildReferralLink(code, baseUrl)` → `/?ref=CODE`; `getReferrerIdByCode(code)`; `recordClick(referrerId, metadata?)`; `attributeSignup(referredUserId, referralCode)` → referrerId or null; `getReferralStats(userId)` → clicks, signups, pendingRewards, redeemedRewards. |
| **ReferralTrackingResolver** | `getReferralCodeFromRequest(req)` from query or cookie; `setReferralCookie(response, code)` (30-day af_ref); `resolveAndPersistClick(req)` for server-side flow (optional). |
| **RewardDistributionService** | `grantRewardForSignup(referrerId)` — create one pending reward per attributed signup; `listRewards(userId)`; `redeemReward(rewardId, userId)`; `getRewardLabel(type)`. |

### 1.3 API

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|--------|
| `/api/referral/link` | GET / POST | Yes | Get or create my referral code and full link. |
| `/api/referral/track-click` | POST | No | Body or query `ref=CODE`. Record click, set `af_ref` cookie. |
| `/api/referral/stats` | GET | Yes | My stats: clicks, signups, pendingRewards, redeemedRewards. |
| `/api/referral/rewards` | GET | Yes | List my rewards (id, type, label, status, grantedAt, redeemedAt). |
| `/api/referral/rewards/redeem` | POST | Yes | Body `{ rewardId }`. Redeem one reward. |

### 1.4 Attribution on signup

- **Register** (`/api/auth/register`): Reads `referralCode` from body or `af_ref` cookie. After creating the user, calls `attributeSignup(newUserId, referralCode)`; if that returns `referrerId`, calls `grantRewardForSignup(referrerId)`. Signup page sends `referralCode` from `?ref=` when present so direct visits to `/signup?ref=CODE` also attribute.
- **Cookie:** Set by `/api/referral/track-click` when client sends `ref=CODE` (e.g. from ReferralTracker when page has `?ref=CODE`). Cookie name: `af_ref`; 30-day max-age; httpOnly, sameSite=lax.

### 1.5 Client tracking

- **ReferralTracker** (layout): On mount, if `window.location.search` has `ref=`, calls `POST /api/referral/track-click` with `{ ref }` so the server records the click and sets the cookie. Ensures signups after navigating the site still attribute to the referrer.

---

## 2. Mandatory UI click audit

### 2.1 Share referral link

| Control | Location | Target / Result |
|---------|----------|------------------|
| Settings → Referrals tab | Settings page | Shows “Refer friends” section and referral link (from GET /api/referral/link). |
| Referral link input | Referrals section | Displays full URL `{origin}/?ref={code}`. |
| Copy button | Next to link | Copies link to clipboard; shows “Copied” briefly. |
| Share (Twitter) link | Next to Copy | Opens Twitter intent with message + referral link. |

### 2.2 View referral stats

| Control | Location | Target / Result |
|---------|----------|------------------|
| Clicks card | Referrals section | Shows count from GET /api/referral/stats (clicks). |
| Signups card | Referrals section | Shows count from GET /api/referral/stats (signups). |
| Pending rewards card | Referrals section | Shows pendingRewards from stats. |
| Redeemed card | Referrals section | Shows redeemedRewards from stats. |

### 2.3 Redeem rewards

| Control | Location | Target / Result |
|---------|----------|------------------|
| Rewards list | Referrals section | From GET /api/referral/rewards; each row: label, status (Pending / Redeemed). |
| “Redeem” button | Per pending reward | POST /api/referral/rewards/redeem with rewardId; on success, row shows Redeemed and button hidden; stats update. |

### 2.4 Referral attribution

| Scenario | Result |
|----------|--------|
| User A shares link `/?ref=A_CODE`. User B opens link. | ReferralTracker calls track-click; click event created for A; af_ref cookie set with A_CODE. |
| User B signs up (same browser). | Register reads af_ref (or client sends referralCode); after create user, attributeSignup(B, A_CODE) links B to A; grantRewardForSignup(A) creates one pending reward for A. |
| User A opens Settings → Referrals. | Stats show signups ≥ 1, pending rewards ≥ 1; rewards list shows “Referred a friend” pending. |
| User A clicks Redeem on that reward. | Reward status → redeemed; stats updated; redeem button hidden. |

---

## 3. QA: Referral tracking end-to-end

### 3.1 Flow

1. **Referrer:** Log in → Settings → Referrals → copy link (e.g. `https://allfantasy.ai/?ref=ABCD1234`).
2. **Referee (new user):** Open link in incognito/fresh browser → ReferralTracker fires → POST /api/referral/track-click with ref → click recorded, af_ref set.
3. **Referee:** Sign up (same browser) → register receives af_ref cookie (or body.referralCode) → after user create, attributeSignup(newUserId, code) creates ReferralEvent type=signup; grantRewardForSignup(referrerId) creates ReferralReward pending.
4. **Referrer:** Settings → Referrals → stats show +1 signup, +1 pending reward; rewards list shows one “Referred a friend” with Redeem.
5. **Referrer:** Click Redeem → reward status redeemed; stats show redeemedRewards +1.

### 3.2 Edge cases

- **Invalid ref:** track-click returns 400 Invalid ref; no cookie set.
- **Self-referral:** attributeSignup returns null when referrerId === referredUserId (no reward).
- **Duplicate redeem:** redeemReward returns error “Already redeemed”.

---

## 4. Files touched (reference)

- **New:** `lib/referral/ReferralService.ts`, `ReferralTrackingResolver.ts`, `RewardDistributionService.ts`, `index.ts`; `app/api/referral/link/route.ts`, `track-click/route.ts`, `stats/route.ts`, `rewards/route.ts`, `rewards/redeem/route.ts`; `components/settings/ReferralSection.tsx`; `components/referral/ReferralTracker.tsx`; `prisma/migrations/20260327000000_add_referral_system/migration.sql`.
- **Modified:** `prisma/schema.prisma` (ReferralCode, ReferralEvent, ReferralReward + AppUser relations); `app/api/auth/register/route.ts` (referralCode from body/cookie, attributeSignup, grantRewardForSignup); `app/settings/SettingsClient.tsx` (Referrals tab + ReferralSection); `app/layout.tsx` (ReferralTracker).
