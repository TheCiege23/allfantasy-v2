# PROMPT 142 — AllFantasy Viral Invite Engine — Deliverable

## Summary

Unified viral invite engine for leagues, brackets, creator leagues, referral, reactivation, and waitlist. Supports unique token generation, deep links, invite analytics, acceptance tracking, expiration, status lifecycle, and basic fraud/abuse protection.

**Supported sports:** NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer (aligned with `lib/sport-scope.ts` where applicable).

---

## Schema changes

### New models

**InviteLink**
- `id`, `type` (league | bracket | creator_league | referral | reactivation | waitlist)
- `token` (unique), `createdByUserId`, `targetId` (nullable, e.g. leagueId)
- `expiresAt`, `maxUses`, `useCount`, `status` (active | expired | revoked | max_used)
- `metadata` (Json), `createdAt`, `updatedAt`
- Relation: `createdBy` → AppUser, `events` → InviteLinkEvent[]

**InviteLinkEvent**
- `id`, `inviteLinkId`, `eventType` (viewed | shared | accepted | expired_shown | copy_link | sms | email | twitter | discord | reddit | whatsapp)
- `channel`, `metadata`, `createdAt`
- Relation: `inviteLink` → InviteLink

### AppUser

- New relation: `inviteLinksCreated` → InviteLink[]

### Migration

- `prisma/migrations/20260320000000_add_viral_invite_engine/migration.sql`

---

## Invite routes (API)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/invite/generate` | Create invite link (body: type, targetId?, expiresInDays?, maxUses?). Auth required. |
| GET | `/api/invite/preview?code=XXX&userId=&recordView=` | Public preview for code; optional view event. |
| POST | `/api/invite/accept` | Accept invite (body: code). Auth required. |
| GET | `/api/invite/list?type=` | List current user’s invite links. Auth required. |
| GET | `/api/invite/stats` | Invite/referral stats (created, accepted, by type, recent events). Auth required. |
| POST | `/api/invite/share` | Log share event (body: inviteLinkId or token, channel). |
| POST | `/api/invite/revoke` | Revoke invite link (body: inviteLinkId). Auth required. |

---

## Frontend components

| Component | Path | Purpose |
|-----------|------|---------|
| InvitePreviewCard | `components/invite/InvitePreviewCard.tsx` | Display public-safe invite preview (title, status, accept CTA). |
| InviteShareSheet | `components/invite/InviteShareSheet.tsx` | Share actions: copy link, SMS, email, X, Discord, Reddit, WhatsApp. |
| InviteModal | `components/invite/InviteModal.tsx` | Generate invite → show share sheet. |
| InviteManagementPanel | `components/invite/InviteManagementPanel.tsx` | Table of user’s invite links; copy URL, revoke. |
| ReferralDashboard | `components/invite/ReferralDashboard.tsx` | Stats (created, accepted), recent events, “Create invite link” → InviteModal. |

---

## Frontend pages

| Route | Purpose |
|-------|---------|
| `/invite/accept` | Unified accept page: `?code=XXX` → preview → accept (bracket / creator_league / referral etc.). |
| `/referrals` | Invite & referral dashboard: ReferralDashboard + InviteManagementPanel (auth required). |

---

## Share targets

- **Copy link** — clipboard; logs `shared` + channel `copy_link`.
- **SMS** — `sms:?body=...`
- **Email** — `mailto:?subject=...&body=...`
- **X (Twitter)** — `https://twitter.com/intent/tweet?text=...&url=...`
- **Discord** — copy link (same URL).
- **Reddit** — `https://www.reddit.com/submit?url=...&title=...`
- **WhatsApp** — `https://wa.me/?text=...`

All channels log to `/api/invite/share` when used from InviteShareSheet (inviteLinkId or token + channel).

---

## Analytics notes

- **InviteLinkEvent** stores: `eventType`, `channel`, `inviteLinkId`, `metadata`, `createdAt`.
- Events: `viewed` (preview load), `shared` (with channel: copy_link, sms, email, twitter, discord, reddit, whatsapp), `accepted`.
- Preview API can record a `viewed` event when `recordView` is not false.
- Accept flow increments `InviteLink.useCount` and writes an `accepted` event.
- Stats API aggregates: total created, total accepted, by type, and recent events for the current user.
- No PII in event payloads; public preview returns only title, targetName, sport, memberCount, status.

---

## Invite lifecycle & abuse protection

- **Status:** active → expired (by time), max_used (by use count), or revoked (manual).
- **Expiration:** `expiresAt` checked on get and accept; status updated to `expired` when past.
- **Max uses:** when `maxUses > 0` and `useCount >= maxUses`, status set to `max_used` and accept rejected.
- **Anti-reuse:** Accept is idempotent for “already member” (bracket/creator_league); useCount incremented once per successful accept.
- **Rate limit:** up to `MAX_ACTIVE_PER_USER_PER_DAY` (100) new invite links per user per type per 24h.
- **Token:** unique, URL-safe, collision-resistant generation with retries.

---

## QA checklist

- [ ] **Generate invite works** — From modal or referrals page, “Generate invite link” returns a link and token; link appears in InviteManagementPanel.
- [ ] **Copy link works** — Copy button copies the invite URL; clipboard has correct `/invite/accept?code=...`; share event is logged.
- [ ] **Invite preview loads correctly** — `/invite/accept?code=XXX` and `/api/invite/preview?code=XXX` return correct title, status (valid/expired/full/already_member/invalid).
- [ ] **Accept invite works** — Logged-in user can accept; redirect to bracket or creator league when applicable; useCount and accepted event update.
- [ ] **Expired invite state works** — Preview shows “expired”; accept returns 410 or error; no double-use.
- [ ] **Invite share actions work or degrade** — Copy, SMS, email, X, Discord, Reddit, WhatsApp open or copy as designed; 404/network errors do not break UI.
- [ ] **Referral stats update correctly** — After creating/accepting invites, `/api/invite/stats` and ReferralDashboard show updated totals and recent activity.
- [ ] **No dead social share buttons** — Each share channel has a working action (copy or open URL).
- [ ] **Revoke works** — Revoked link no longer accepts; status shown in panel.
- [ ] **Invalid/expired handled** — Invalid code shows clear message; expired shows expired state.

---

## Files added/updated

### New
- `prisma/migrations/20260320000000_add_viral_invite_engine/migration.sql`
- `lib/invite-engine/types.ts`
- `lib/invite-engine/tokenGenerator.ts`
- `lib/invite-engine/shareUrls.ts`
- `lib/invite-engine/InviteEngine.ts`
- `lib/invite-engine/index.ts`
- `app/api/invite/generate/route.ts`
- `app/api/invite/preview/route.ts`
- `app/api/invite/accept/route.ts`
- `app/api/invite/list/route.ts`
- `app/api/invite/stats/route.ts`
- `app/api/invite/share/route.ts`
- `app/api/invite/revoke/route.ts`
- `app/invite/accept/page.tsx`
- `app/referrals/page.tsx`
- `components/invite/InvitePreviewCard.tsx`
- `components/invite/InviteShareSheet.tsx`
- `components/invite/InviteModal.tsx`
- `components/invite/InviteManagementPanel.tsx`
- `components/invite/ReferralDashboard.tsx`
- `components/invite/index.ts`

### Schema
- `prisma/schema.prisma` — InviteLink, InviteLinkEvent, AppUser.inviteLinksCreated
