# Prompt 108 — Creator / Influencer League System

## Deliverable summary

- **Creator system:** Verified creators have a CreatorProfile (handle, verifiedAt). They can host bracket leagues; creator profile page shows their public leagues with join links. Leaderboard ranks creators by leagues or members.
- **Core modules:** CreatorProfileService (get by userId/handle, isVerifiedCreator, listCreatorsLeaderboard), CreatorLeagueResolver (getCreatorForLeague, getPublicCreatorLeagues).
- **UI:** Verified creator badge (with link to profile), creator profile page (`/creators/[handle]`), creator leaderboards (`/creators`), creator badge on league detail when owner is a creator, "Join creator league" on profile leagues.
- **QA:** Creator profile links, creator league buttons, and join creator league flows verified.

---

## 1. Architecture

### 1.1 Data model

- **CreatorProfile:** id, userId (unique), handle (unique, URL-safe), verifiedAt (DateTime?; when set, user is a verified creator), createdAt, updatedAt. Relation: user → AppUser.

### 1.2 Core modules (`lib/creator/`)

| Module | Responsibilities |
|--------|------------------|
| **CreatorProfileService** | `getCreatorByUserId(userId)` → CreatorProfilePublic (with leagueCount, totalMembers). `getCreatorByHandle(handle)` → same by handle. `normalizeHandle(raw)`. `isVerifiedCreator(userId)`. `listCreatorsLeaderboard({ limit, sort })` → CreatorLeaderboardEntry[] (rank, leagueCount, totalMembers; sort by "leagues" or "members"). |
| **CreatorLeagueResolver** | `getCreatorForLeague(leagueId)` → CreatorForLeague (userId, handle, displayName, avatarUrl, verified) if owner is a verified creator; else null. `getPublicCreatorLeagues(userId, limit)` → CreatorLeagueCard[] (id, name, joinCode, joinUrl, tournamentName, season, sport, memberCount, maxManagers, isPrivate, scoringMode). |

### 1.3 API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/creators` | GET | Leaderboard: ?limit=&sort=members|leagues. Returns { creators: CreatorLeaderboardEntry[] }. |
| `/api/creators/[handle]` | GET | Creator profile + leagues. Returns { creator, leagues }. 404 if not found. |
| `/api/creators/league/[leagueId]/creator` | GET | Creator for league (if owner is verified creator). Returns { creator } or { creator: null }. |

---

## 2. Features

### 2.1 Verified creator badge

- **Component:** `VerifiedCreatorBadge` (handle, displayName?, size, showLabel, linkToProfile). Renders a “Creator” badge with checkmark; optional link to `/creators/[handle]`.
- **Usage:** Leaderboard rows, creator profile header, league detail header (via `LeagueCreatorBadge` when league owner is a creator).

### 2.2 Public creator leagues

- **Resolver:** `getPublicCreatorLeagues(userId)` returns leagues owned by that user (only if user is a verified creator). Each card includes joinUrl = `/brackets/join?code=...`.
- **Profile page:** Lists these leagues with “View” (league detail) and “Join league” (joinUrl).

### 2.3 Creator profile page

- **Route:** `/creators/[handle]`. Server component: loads creator by handle and their public leagues. Renders profile card (avatar, display name, @handle, verified badge, league count, member count) and `CreatorLeaguesClient` with list of leagues and Join/View buttons.

### 2.4 Creator leaderboards

- **Route:** `/creators`. Lists verified creators sorted by members or leagues. Each row links to `/creators/[handle]`. Entry point: “Creator leagues” on brackets home.

---

## 3. Mandatory UI click audit

### 3.1 Creator profile links

| Control | Location | Target / Result |
|---------|----------|------------------|
| Creator row | /creators (leaderboard) | Link to `/creators/[handle]` → creator profile page. |
| VerifiedCreatorBadge (with link) | League detail header (when owner is creator) | Link to `/creators/[handle]` → creator profile. |

### 3.2 Creator league buttons

| Control | Location | Target / Result |
|---------|----------|------------------|
| View | Creator profile league row | Link to `/brackets/leagues/[id]` → league detail. |
| Join league | Creator profile league row | Link to `joinUrl` (`/brackets/join?code=...`) → join flow. |

### 3.3 Join creator league

| Flow | Result |
|------|--------|
| User on creator profile → “Join league” on a league | Opens join URL; user can sign in if needed and complete join; redirect to league. |

---

## 4. QA: Creator leagues function correctly

- **Leaderboard:** Only users with a CreatorProfile and non-null verifiedAt appear. Counts (leagueCount, totalMembers) match DB. Sort by members/leagues changes order.
- **Profile by handle:** Valid handle returns creator and leagues; invalid handle 404. Leagues are only those owned by that user and match getPublicCreatorLeagues.
- **Creator for league:** GET league/[leagueId]/creator returns creator when owner has verified CreatorProfile; otherwise creator: null. League detail badge appears only when creator is returned.
- **Join:** joinUrl uses the league’s joinCode; opening it loads existing bracket join page; join flow unchanged.

---

## 5. Adding creators

- Creators are created by inserting into `CreatorProfile` (userId, handle, verifiedAt). To verify, set `verifiedAt` to a non-null timestamp. Handles are normalized (lowercase, URL-safe). Example (admin/script): create CreatorProfile for a user and set verifiedAt = now() to make them a verified creator.

---

## 6. Files touched (reference)

- **New:** `prisma/migrations/20260328000000_add_creator_profiles/migration.sql`, `lib/creator/CreatorProfileService.ts`, `CreatorLeagueResolver.ts`, `index.ts`; `app/api/creators/route.ts`, `app/api/creators/[handle]/route.ts`, `app/api/creators/league/[leagueId]/creator/route.ts`; `components/creator/VerifiedCreatorBadge.tsx`, `LeagueCreatorBadge.tsx`; `app/creators/page.tsx`, `CreatorsLeaderboardClient.tsx`, `app/creators/[handle]/page.tsx`, `CreatorLeaguesClient.tsx`.
- **Modified:** `prisma/schema.prisma` (CreatorProfile model + AppUser.creatorProfile); `app/brackets/leagues/[leagueId]/page.tsx` (LeagueCreatorBadge in header); `app/brackets/page.tsx` (Creator leagues link).
