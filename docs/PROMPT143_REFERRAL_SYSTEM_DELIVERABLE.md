# PROMPT 143 — AllFantasy Referral System — Deliverable

## Summary

Referral system that rewards user growth and supports creator/influencer expansion: unique codes, attribution, progress tracking, rewards/XP/badges, creator referral tiers, fraud prevention basics, leaderboard, and onboarding tracking.

**Supported sports:** NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer (referral system is sport-agnostic; tiers apply to all).

---

## Database (existing; no new tables)

- **ReferralCode** — userId, code (unique), createdAt
- **ReferralEvent** — referrerId, referredUserId?, type (click | signup | reward_eligible), metadata, createdAt
- **ReferralReward** — userId, type (e.g. referral_signup), status (pending | redeemed), metadata, grantedAt, redeemedAt

No schema migration required; existing models used.

---

## Backend

### ReferralService (existing)

- `getOrCreateReferralCode(userId)` → code
- `buildReferralLink(code, baseUrl)` → `/?ref=CODE`
- `getReferrerIdByCode(code)`
- `recordClick(referrerId, metadata?)`
- `attributeSignup(referredUserId, referralCode)` → referrerId | null (self-referral returns null)
- `getReferralStats(userId)` → clicks, signups, pendingRewards, redeemedRewards

### RewardDistributionService (updated)

- `REWARD_TYPE_SIGNUP`, `REWARD_TYPE_LABELS` (configurable labels; add keys for future reward types)
- `grantRewardForSignup(referrerId)`
- `listRewards(userId)`
- `redeemReward(rewardId, userId)` — rate limit: 20 redemptions per user per minute; already-redeemed and not-found handled
- `getRewardLabel(type)` — uses REWARD_TYPE_LABELS map (admin can extend)

### ReferralLeaderboardService (new)

- `REFERRAL_TIERS` — Starter, Bronze Ambassador (3+), Silver (10+), Gold (25+), Elite (50+), Legend (100+)
- `getTierForSignups(signups, isCreator?)` → { id, label }
- `getReferralLeaderboard({ limit, sortBy })` — sortBy: signups | clicks | rewards
- `getReferrerProgress(userId)` — signups, clicks, pending/redeemed rewards, tier, nextMilestone, milestones[]

### API routes

| Method | Path | Description |
|--------|------|-------------|
| GET / POST | `/api/referral/link` | Get or create referral code and link (auth). Returns `{ ok, code, link }`. |
| GET | `/api/referral/stats` | Clicks, signups, pendingRewards, redeemedRewards (auth). |
| GET | `/api/referral/rewards` | List rewards with labels (auth). |
| POST | `/api/referral/rewards/redeem` | Redeem reward by rewardId (auth). |
| POST | `/api/referral/track-click` | Record click and set af_ref cookie (body: ref). |
| GET | `/api/referral/leaderboard` | Leaderboard (query: sortBy=signups|clicks|rewards, limit). Public or auth. |
| GET | `/api/referral/progress` | Current user progress + tier + milestones (auth). |

---

## Frontend

### Pages

| Route | Description |
|-------|-------------|
| `/referral` | Referral dashboard: code & link (copy code, copy link, share), stats, progress widget, rewards list (with redeem), leaderboard, CTA to invite links. |

### Components

| Component | Path | Description |
|-----------|------|-------------|
| ReferralSection | `components/settings/ReferralSection.tsx` | Code + link inputs, Copy code, Copy link, Share (X); stats grid; rewards list with Redeem. Used in Settings and on /referral. |
| ReferralProgressWidget | `components/referral/ReferralProgressWidget.tsx` | Tier, signups, next milestone progress bar. |
| ReferralCTACard | `components/referral/ReferralCTACard.tsx` | CTA card (title, description, link); variants: default, rewards, leaderboard. |
| ReferralLeaderboard | `components/referral/ReferralLeaderboard.tsx` | Sortable leaderboard (signups/clicks/rewards), avatar, displayName, tier, creator badge. |
| ReferralTracker | `components/referral/ReferralTracker.tsx` | Client: on load with ?ref=, POST track-click and set cookie (existing). |

### Integration

- **Register** — Reads referralCode from body or af_ref cookie; after user create, `attributeSignup(newUserId, code)` then `grantRewardForSignup(referrerId)` (existing).
- **Settings** — Referrals tab uses ReferralSection (existing); section now includes Copy code and Copy link.

---

## Creator referral tiers

- Same referral flow for all users; creators are users with a creator profile.
- Leaderboard shows `isCreator` and tier label; tiers are based on signup count (Starter → Legend).
- Tier labels are not different for creators; admin can later add creator-only tiers via config.

---

## Fraud prevention

- **Self-referral:** `attributeSignup` returns null when referrerId === referredUserId; no reward granted.
- **Redeem rate limit:** Max 20 redemptions per user per minute.
- **Already redeemed:** redeemReward returns error; no double credit.
- **Invalid ref:** track-click returns 400; no cookie set.

---

## Preserve existing systems

- **XP / badges:** No hardcoded single reward type; `REWARD_TYPE_LABELS` is a map. Redeem does not currently call XP or badge APIs; comment in code indicates where to hook in `checkAndAwardBadge` or grant XP when desired.
- **Reward types:** New types can be added to `REWARD_TYPE_LABELS` and granted via new service methods without changing redeem flow.

---

## QA and manual testing checklist

- [ ] **Copy referral code works** — Dashboard and Settings show code; "Copy code" copies to clipboard; pasted value matches.
- [ ] **Share referral link works** — "Copy link" copies full URL with ref=; Share (X) opens tweet intent with link.
- [ ] **Reward state updates after successful referral** — Referee signs up with ref cookie/param; referrer sees +1 signup and +1 pending reward; after redeem, pending decreases and redeemed increases.
- [ ] **Leaderboard opens correctly** — /referral shows leaderboard; sort by Signups/Clicks/Rewards updates list; entries show rank, name, tier, creator flag, count.
- [ ] **Referral dashboard data reloads correctly** — After signup or redeem, refresh or re-open dashboard shows updated stats, progress, and rewards.
- [ ] **No dead reward claim buttons** — Pending rewards show "Redeem"; clicking triggers API and updates state; Redeemed rewards do not show Redeem button.
- [ ] **Progress widget** — Shows current tier and next milestone bar when applicable; top tier shows "Top tier reached."
- [ ] **Self-referral** — Signing up with own ref does not grant reward to self.
- [ ] **Rate limit** — Redeeming many rewards in a short time returns error after limit.

---

## Files touched

### New
- `lib/referral/ReferralLeaderboardService.ts`
- `app/api/referral/leaderboard/route.ts`
- `app/api/referral/progress/route.ts`
- `components/referral/ReferralProgressWidget.tsx`
- `components/referral/ReferralCTACard.tsx`
- `components/referral/ReferralLeaderboard.tsx`
- `app/referral/page.tsx`

### Updated
- `lib/referral/RewardDistributionService.ts` — REWARD_TYPE_LABELS, redeem rate limit, getRewardLabel from map
- `lib/referral/index.ts` — export leaderboard + progress
- `components/settings/ReferralSection.tsx` — copy code, copy link, use invite-engine share URL, link to /referral
