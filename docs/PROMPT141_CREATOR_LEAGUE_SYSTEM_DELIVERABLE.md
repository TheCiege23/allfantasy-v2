# PROMPT 141 — AllFantasy Creator League System — Deliverable

## Summary

Creator League System allows public creators to run branded fantasy leagues and bracket competitions: create public branded leagues, customize branding, issue shareable invite links, grow followers, and publish league recaps. Supported sports: NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer (via `lib/sport-scope.ts`).

---

## Schema (already in place)

- **CreatorProfile**: `id`, `userId`, `handle`, `slug`, `displayName`, `bio`, `avatarUrl`, `bannerUrl`, `websiteUrl`, `socialHandles` (Json), `verifiedAt`, `verificationBadge`, `visibility`, `branding` (Json).
- **CreatorLeague**: `creatorId`, `type` (FANTASY | BRACKET), `leagueId`, `bracketLeagueId`, `name`, `slug`, `description`, `sport`, `inviteCode`, `isPublic`, `maxMembers`, `memberCount`, `joinDeadline`.
- **CreatorInvite**: `creatorId`, `creatorLeagueId?`, `code`, `expiresAt`, `maxUses`, `useCount`.
- **CreatorLeagueMember**: `creatorLeagueId`, `userId`, `joinedAt`, `joinedViaCode`.
- **CreatorAnalyticsEvent**: `creatorId`, `eventType`, `leagueId?`, `metadata` (analytics-safe).

---

## Migrations

- `prisma/migrations/20260343000000_add_creator_league_system/migration.sql` — adds/alters creator tables and indexes.

---

## Route List

### App (frontend)

| Route | Description |
|-------|-------------|
| `/creator` | Creator dashboard / “become a creator” |
| `/creators` | Creator discovery (cards, sport filter) |
| `/creators/[handle]` | Creator public profile (handle or slug); header, follow, share, leagues, analytics (owner), branding (owner) |
| `/creator/leagues/[leagueId]` | Creator league landing; join via `?join=code`; invite panel |
| `/join` | Join by invite code (`?code=XXX`); redirects to league or shows result |

### API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/creators` | List creators (query: `visibility`, `sport`, `limit`, `cursor`) |
| GET | `/api/creators/[creatorIdOrSlug]` | Get creator by id or slug (returns `isOwner` for viewer) |
| PATCH | `/api/creators/[creatorIdOrSlug]` | Update creator (owner only; allowed fields: displayName, bio, avatarUrl, bannerUrl, websiteUrl, socialHandles, visibility, branding) |
| GET | `/api/creators/[creatorIdOrSlug]/leagues` | List creator leagues |
| POST | `/api/creators/[creatorIdOrSlug]/follow` | Follow creator |
| POST | `/api/creators/[creatorIdOrSlug]/unfollow` | Unfollow creator |
| PATCH | `/api/creators/[creatorIdOrSlug]/branding` | Update branding (owner only) |
| GET | `/api/creators/[creatorIdOrSlug]/analytics` | Analytics summary (owner only; query: `period`) |
| POST | `/api/creators/[creatorIdOrSlug]/share` | Log invite_share and return share URL |
| POST | `/api/creator-invites/join` | Join by invite code (body: `{ code }`) |
| GET | `/api/creator/leagues/[leagueId]` | Get creator league by id (for landing page) |

---

## Files Added/Updated

### [NEW]

- `lib/creator-system/types.ts`
- `lib/creator-system/CreatorService.ts`
- `lib/creator-system/index.ts`
- `app/api/creators/route.ts`
- `app/api/creators/[creatorIdOrSlug]/route.ts`
- `app/api/creators/[creatorIdOrSlug]/leagues/route.ts`
- `app/api/creators/[creatorIdOrSlug]/follow/route.ts`
- `app/api/creators/[creatorIdOrSlug]/unfollow/route.ts`
- `app/api/creators/[creatorIdOrSlug]/branding/route.ts`
- `app/api/creators/[creatorIdOrSlug]/analytics/route.ts`
- `app/api/creators/[creatorIdOrSlug]/share/route.ts`
- `app/api/creator-invites/join/route.ts`
- `app/api/creator/leagues/[leagueId]/route.ts`
- `components/creator-system/CreatorCard.tsx`
- `components/creator-system/CreatorLeagueCard.tsx`
- `components/creator-system/CreatorProfileHeader.tsx`
- `components/creator-system/CreatorStatsPanel.tsx`
- `components/creator-system/CreatorInvitePanel.tsx`
- `components/creator-system/CreatorBrandingEditor.tsx`
- `components/creator-system/CreatorCommunityPreview.tsx`
- `components/creator-system/index.ts`
- `app/creator/page.tsx`
- `app/creator/leagues/[leagueId]/page.tsx`
- `app/creators/CreatorsDiscoveryClient.tsx`
- `app/join/page.tsx`

### [UPDATED]

- `app/creators/page.tsx` — uses `CreatorsDiscoveryClient`, copy tweak
- `app/creators/[handle]/page.tsx` — client page using new API; `CreatorProfileHeader`, leagues, analytics tab, branding tab

### [REMOVED]

- `app/api/creators/[handle]/route.ts` — replaced by `[creatorIdOrSlug]`

---

## QA Checklist (Click Audit)

- [ ] **Profile card opens correctly** — From `/creators`, click a creator card → opens `/creators/[slug]` (or handle).
- [ ] **Follow button works** — On discovery and profile: Follow toggles state and calls `/api/creators/[slug]/follow`; Following state reflects after reload.
- [ ] **Join league button works** — On profile or league card, “Join league” goes to invite URL or `/creator/leagues/[id]?join=code`; join API is called; membership and “Joined” state update.
- [ ] **Share invite button works** — Share copies URL and (where implemented) calls share API to log `invite_share`.
- [ ] **Creator profile route works** — `/creators/[handle]` and `/creators/[slug]` both resolve (API accepts id or slug).
- [ ] **Creator analytics tab works** — When viewer is owner, Analytics tab shows and loads `/api/creators/[slug]/analytics`; stats (profile views, follow count, league joins, invite shares) display.
- [ ] **Mobile and desktop layout** — Creator cards, profile header, league cards, and tabs behave on small and large viewports.
- [ ] **No dead branding controls** — Branding tab (owner only) saves via PATCH branding API; logo URL and colors persist.
- [ ] **No placeholder follow/subscribe** — All follow and share actions call real APIs; no stub buttons.

### Backend / Visibility / Roles

- [ ] **Persistence** — Creator and league data persist; follow, join, and branding updates persist.
- [ ] **Role checks** — Only profile owner can PATCH creator, PATCH branding, and GET analytics.
- [ ] **Public/private visibility** — Private creators only visible to owner; list and profile respect visibility.
- [ ] **Graceful fallback** — Missing avatar/banner do not break UI (initials/placeholder).
- [ ] **Share URL generation** — Share endpoint returns correct public URL for profile/league.

---

## Sport scope

All sport filters and validation use `SUPPORTED_SPORTS` and helpers from `lib/sport-scope.ts` (NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER).
