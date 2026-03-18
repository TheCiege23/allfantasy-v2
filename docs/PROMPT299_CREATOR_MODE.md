# PROMPT 299 — Creator Mode

## Objective

Let influencers use AllFantasy: public leagues, followers joining leagues, share league links, and AI-generated content for their audience.

## Features

### 1. Public leagues

- Creators have a **CreatorProfile** and can create **CreatorLeague** entries (linked to a League or BracketLeague).
- Leagues can be **public** (`isPublic: true`) so they appear on the creator’s profile and in discovery.
- **Creator dashboard** (`/creator`) and **Creator profile** (`/creators/[handle]`) list the creator’s leagues; visitors see “Join league” and invite links.

### 2. Followers join leagues

- **Follow**: Users can follow a creator (UserFollow); creator profile shows follower count and Follow/Unfollow.
- **Join**: Followers (or anyone with the link) can join a creator league via **invite code** or **invite URL** (`/join?code=XXX`). CreatorLeagueMember records membership; CreatorInvite tracks code usage.
- **Creator tools** (see below) make it easy to copy and share league invite links so followers can join.

### 3. Share league links

- **Profile link**: Copy link to creator profile (`/creators/[slug]`) so followers can discover all of the creator’s leagues.
- **League invite link**: Per-league invite URL (e.g. `/join?code=ABC123` or creator-league-specific URL). CreatorToolsPanel and CreatorLeagueCard offer “Copy invite” and “Share invite.”
- **Share to Discord / Reddit**: Creator tools use **CommunitySharePanel** so creators can copy content for Discord or get a Reddit-ready post (title + body + submit URL) for each league, e.g. “Join [League name] — [Creator].”

### 4. AI-generated content for audience

- **Create post for audience**: From Creator tools, a link to **Social media content generator** (`/app/social-content`) so creators can generate ready-to-post captions and images (draft results, weekly recaps, trade reactions, power rankings) with required hashtags.
- Content can be shared to X, Discord, Reddit, Instagram; creators use it for their audience without leaving the app.

## Deliverable: Creator tools

### API

- **GET /api/creators/me** — Returns the current user’s creator profile and leagues (for creator dashboard). Auth required. If the user has no creator profile, returns `{ creator: null, leagues: [] }`.

### UI

- **CreatorToolsPanel** — Shown on the creator dashboard when the user has a creator profile:
  - **Share your profile**: Copy profile URL so followers can discover leagues.
  - **Share league links**: List of public leagues; per league: copy invite link and a **CommunitySharePanel** (Copy for Discord, Reddit copy title/body, Open Reddit submit).
  - **AI-generated content for audience**: Link to `/app/social-content` (“Create post for audience”) for draft/recap/trade/rankings posts.

### Creator dashboard

- **/creator** — Sign-in gate; then dashboard with “Discover creators,” “My leagues,” and (if the user is a creator) a **Creator tools** section that renders CreatorToolsPanel with profile + leagues from GET /api/creators/me.

### Existing pieces (unchanged)

- Creator profile page: `/creators/[handle]` (profile, leagues, analytics, branding).
- Creator leagues: CreatorLeagueCard (View, Join league, Share invite).
- Join by code: POST /api/creator-invites/join.
- Follow: POST /api/creators/[id]/follow, unfollow.
- Share: POST /api/creators/[id]/share (returns profile URL).

## Files

- **API**: `app/api/creators/me/route.ts`
- **UI**: `components/creator-system/CreatorToolsPanel.tsx`, `components/creator-system/index.ts`
- **Dashboard**: `app/creator/page.tsx` (Creator tools section + CreatorToolsPanel)

## Summary

- **Public leagues**: CreatorLeague with isPublic; discoverable on creator profile.
- **Followers join leagues**: Follow via UserFollow; join via invite code/URL (CreatorInvite, CreatorLeagueMember).
- **Share league links**: Profile URL + per-league invite URL; Creator tools add Discord/Reddit share (CommunitySharePanel).
- **AI-generated content for audience**: Link from Creator tools to Social content generator for captions and images.
