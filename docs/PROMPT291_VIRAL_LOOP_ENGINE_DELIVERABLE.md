# PROMPT 291 — AllFantasy Viral Loop Engine Deliverable

**Objective:** Turn every user action into a potential growth loop.  
**Scope:** Referral tracking, invite links per league, shareable URLs with metadata, growth attribution.  
**Date:** 2025-03-17

---

## 1. Core viral loops (mapped)

| Loop | Trigger | Flow | Tracking |
|------|---------|------|----------|
| **League creation** | User creates league → invites friends | Commissioner gets invite link (GET/POST `/api/commissioner/leagues/[leagueId]/invite`). Friend visits `/join?code=XXX` → preview → sign up or join. | `af_league_invite` cookie set when preview succeeds; on signup `recordAttribution(userId, 'league_invite', { sourceId: leagueId })`. |
| **Referral** | User shares referral link | `/?ref=CODE` → track-click sets `af_ref` cookie → signup attributes to referrer. | Existing: `ReferralEvent` (click/signup), `attributeSignup`, `grantRewardForSignup`. New: `recordAttribution(userId, 'referral', { sourceId: referrerId })`. |
| **Draft** | User shares draft results | Share URL with shareId (e.g. `/share/draft/[id]`). | `buildDraftShareUrl(shareId, { params: { utm_source: 'draft_share' } })` for UTM; attribution source `draft_share` can be recorded when a new user lands and signs up (optional). |
| **AI** | User shares AI insight | Share moment/insight URL. | `buildAIShareUrl(momentId)` with `utm_source=ai_share`; attribution when new user converts (optional). |
| **Competition** | Users compare teams, invite others | Compare flow can use invite or referral link. | Attribution source `competition_invite`; use `buildShareUrl` or referral/invite builders. |

---

## 2. Implementation summary

### 2.1 Growth attribution (first-touch)

- **Model:** `GrowthAttribution` (Prisma) — one row per user: `userId`, `source`, `sourceId`, `metadata`, `createdAt`. Unique on `userId`.
- **Sources:** `referral` | `league_invite` | `draft_share` | `ai_share` | `competition_invite` | `organic`.
- **Service:** `lib/viral-loop/GrowthAttributionService.ts`
  - `recordAttribution(userId, source, { sourceId?, metadata? })` — idempotent, first-touch only.
  - `getAttribution(userId)` — returns source, sourceId, metadata, createdAt.
  - `getAttributionCountsBySource()` — counts by source for dashboards.

**Registration flow (auth/register):**

1. If `af_ref` cookie and valid referral code → `attributeSignup` + reward + `recordAttribution(userId, 'referral', { sourceId: referrerId })`.
2. Else if `af_league_invite` cookie and valid league code → `recordAttribution(userId, 'league_invite', { sourceId: leagueId, metadata: { inviteCode } })`.
3. Else → `recordAttribution(userId, 'organic', {})`.

### 2.2 League invite cookie (league_invite loop)

- **Cookie:** `af_league_invite` — set when user lands on join with valid code so signup can attribute.
- **API:** `GET /api/viral/context?type=league_invite&code=XXX` — validates code via `validateLeagueJoin`, sets httpOnly cookie (7 days), returns `{ ok: true }`.
- **Join page:** When preview succeeds for `effectiveCode`, client calls `/api/viral/context?type=league_invite&code=...` with `credentials: 'include'` so cookie is set before signup.

### 2.3 Shareable URL builder

- **Module:** `lib/viral-loop/ShareableUrlBuilder.ts`
  - `buildLeagueInviteUrl(code, options)` — `/join?code=XXX` + `utm_source=league_invite`, `utm_medium=invite`.
  - `buildReferralShareUrl(code, options)` — `/?ref=CODE` + optional UTM.
  - `buildDraftShareUrl(shareId, options)` — path `/share/draft/[id]` + `utm_source=draft_share`.
  - `buildAIShareUrl(momentId, options)` — path `/share/[id]` + `utm_source=ai_share`.
  - `buildShareUrl(path, params, baseUrl)` — generic.

- **Commissioner invite:** GET/POST `/api/commissioner/leagues/[leagueId]/invite` now return `joinUrl` built with `buildLeagueInviteUrl(inviteCode, { params: { utm_campaign: 'league_invite' } })` and store that URL in league settings as `inviteLink`.

### 2.4 APIs

| Endpoint | Method | Purpose |
|----------|--------|--------|
| `/api/viral/context` | GET | Query `?type=league_invite&code=XXX`. Validates code, sets `af_league_invite` cookie. |
| `/api/viral/attribution` | GET | Returns current user's growth attribution (source, sourceId, metadata). Auth required. |

### 2.5 Existing systems (unchanged, integrated)

- **Referral:** `lib/referral` — `getOrCreateReferralCode`, `buildReferralLink`, `recordClick`, `attributeSignup`, `af_ref` cookie, `ReferralEvent`, `ReferralReward`. Registration already used referral; now also records growth attribution when referral converts.
- **Invite engine:** `lib/invite-engine` — `createInviteLink`, `acceptInvite`, `InviteLink` (type: league | bracket | creator_league | referral | …), `InviteLinkEvent`. Used for generic invite links; league join for **fantasy** leagues uses `/join?code=` and league settings `inviteCode` (commissioner endpoint).
- **League join:** `POST /api/leagues/join` (fantasy), `GET /api/leagues/join/preview`; `validateLeagueJoin` (league-privacy). Bracket: `POST /api/bracket/leagues/join`, joinCode.

---

## 3. Viral loop architecture (diagram)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        VIRAL LOOPS                                       │
├─────────────────────────────────────────────────────────────────────────┤
│ 1. League creation → Invite link (join?code= + utm) → Friend joins     │
│    → Cookie af_league_invite set on /join preview → Signup attributes    │
│    → GrowthAttribution(league_invite, leagueId)                         │
├─────────────────────────────────────────────────────────────────────────┤
│ 2. Referral → /?ref=CODE → track-click → af_ref cookie → Signup         │
│    → ReferralEvent(signup) + Reward + GrowthAttribution(referral)        │
├─────────────────────────────────────────────────────────────────────────┤
│ 3. Draft share → buildDraftShareUrl(id) → UTM draft_share → New user     │
│    (optional: cookie + attribution on signup)                            │
├─────────────────────────────────────────────────────────────────────────┤
│ 4. AI share → buildAIShareUrl(id) → UTM ai_share → New user (optional)   │
├─────────────────────────────────────────────────────────────────────────┤
│ 5. Competition → Invite / referral link → same as 1 or 2                │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                     TRACKING & ATTRIBUTION                               │
├─────────────────────────────────────────────────────────────────────────┤
│ • ReferralEvent (click, signup) + ReferralReward (existing)              │
│ • InviteLink + InviteLinkEvent (existing)                                │
│ • GrowthAttribution (new) — first-touch per user                        │
│ • Shareable URLs — UTM params (utm_source, utm_medium, utm_campaign)      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Database

- **New table:** `growth_attributions` — `id`, `userId` (unique), `source`, `sourceId`, `metadata` (JSON), `createdAt`. Indexes on `source`, `(source, sourceId)`.
- **Migration:** Run `npx prisma migrate dev --name add_growth_attributions` (or deploy migration in production).

---

## 5. Optional next steps

- **Draft / AI share attribution:** When a user lands on a share URL with `utm_source=draft_share` or `utm_source=ai_share`, set a cookie (e.g. `af_share_source`) and on signup record `recordAttribution(userId, 'draft_share' | 'ai_share', { sourceId: shareId })` if no referral or league_invite.
- **Admin dashboard:** Use `getAttributionCountsBySource()` to show signup breakdown by source.
- **OG metadata:** For share pages (`/share/[id]`, `/share/draft/[id]`), add Open Graph meta tags so shared links show rich previews (title, description, image).

---

## 6. File reference

| Path | Purpose |
|------|--------|
| `prisma/schema.prisma` | `GrowthAttribution` model |
| `lib/viral-loop/types.ts` | Source enum, share params |
| `lib/viral-loop/GrowthAttributionService.ts` | recordAttribution, getAttribution, getAttributionCountsBySource |
| `lib/viral-loop/ShareableUrlBuilder.ts` | buildLeagueInviteUrl, buildReferralShareUrl, buildDraftShareUrl, buildAIShareUrl |
| `lib/viral-loop/index.ts` | Re-exports |
| `app/api/viral/context/route.ts` | Set league_invite cookie |
| `app/api/viral/attribution/route.ts` | Get current user attribution |
| `app/api/auth/register/route.ts` | Record referral or league_invite or organic attribution |
| `app/join/page.tsx` | Call /api/viral/context when preview succeeds |
| `app/api/commissioner/leagues/[leagueId]/invite/route.ts` | buildLeagueInviteUrl for joinUrl |
