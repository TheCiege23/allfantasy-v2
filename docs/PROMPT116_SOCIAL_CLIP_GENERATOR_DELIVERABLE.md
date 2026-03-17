# Prompt 116 — Automated Social Media Clip Generator (Deliverable)

## Goal

Automatically generate shareable graphics for: **weekly league winners**, **biggest upset**, and **top scoring team**.

---

## Architecture

- **SocialClipGenerator** (`lib/social-clips/SocialClipGenerator.ts`): Given clip type and options, returns a `ClipPayload` (title, subtitle, stats). Template-based; can be wired to league/score data later.
- **GraphicRenderer** (`lib/social-clips/GraphicRenderer.tsx`): React component that renders the shareable card. Designed to be captured by `html2canvas` for download (single DOM node with id `social-clip-graphic`).
- **ShareLinkResolver** (`lib/social-clips/ShareLinkResolver.ts`): `getClipPageUrl(id)`, `getTwitterShareUrl(url, text)`, `getFacebookShareUrl(url)`, `getCopyLinkPayload(url, title)`.

Data is stored in **SocialClip** (Prisma): `id`, `userId`, `clipType`, `title`, `subtitle`, `meta` (JSON, includes `stats`), `createdAt`.

---

## Clip types

| Type                    | Description              |
|-------------------------|--------------------------|
| `weekly_league_winners` | Weekly League Winners    |
| `biggest_upset`         | Biggest Upset            |
| `top_scoring_team`      | Top Scoring Team         |

---

## API

| Method | Route | Auth | Description |
|--------|--------|------|-------------|
| POST   | `/api/clips/generate` | Required | Body: `{ type?, title?, subtitle?, leagueName?, week? }`. Creates clip, returns `{ id, ... }`. |
| GET    | `/api/clips`          | Required | List current user's clips (latest 50). |
| GET    | `/api/clips/[id]`     | Public   | Get one clip by id (for share links). |

---

## UI

- **`/clips`**: List user's clips; type selector (league winners / biggest upset / top scoring team); “Generate new graphic” → POST then redirect to `/clips/[id]`.
- **`/clips/[id]`**: Renders the graphic via `GraphicRenderer`, with:
  - **Share graphic**: Copies clip URL to clipboard (and optional native share / “Post to X” via `ShareLinkResolver`).
  - **Download graphic**: `html2canvas` on `#social-clip-graphic` → PNG download.

Share links are **public**: anyone with the link can open `/clips/[id]` and see the same graphic (no login required to view).

---

## Mandatory UI click audit

| Action | Expected | Verification |
|--------|----------|---------------|
| **Share graphic button** | Clip URL is copied to clipboard (or native share / X intent opens). | Click “Share graphic” → paste in new tab → same `/clips/[id]` page and graphic load. |
| **Download graphic button** | PNG file downloads and matches the on-screen graphic. | Click “Download graphic” → open file → visual matches the card (title, subtitle, stats, branding). |
| **Share link in new tab** | Opening the copied URL in a new tab shows the same clip. | Copy link from Share → open in incognito or second browser → page shows same graphic (public view). |

---

## QA — Verify clip generation

1. **Generate**: Log in → go to `/clips` → select “Weekly League Winners” → “Generate new graphic” → redirect to `/clips/[id]`.
2. **Content**: Title, subtitle, and stats match the selected type and any options (e.g. league name / week if provided).
3. **Share**: Click “Share graphic” → paste URL in new tab → same clip and graphic.
4. **Download**: Click “Download graphic” → PNG downloads and matches the on-screen card.
5. **Types**: Repeat for “Biggest Upset” and “Top Scoring Team” and confirm labels/accents differ.

---

## Files added/updated

- **Schema**: `prisma/schema.prisma` — `SocialClip` model; `AppUser.socialClips` relation.
- **Migration**: `prisma/migrations/20260322000001_add_social_clips/migration.sql`.
- **Lib**: `lib/social-clips/types.ts`, `SocialClipGenerator.ts`, `ShareLinkResolver.ts`, `GraphicRenderer.tsx`, `index.ts`.
- **API**: `app/api/clips/route.ts`, `app/api/clips/generate/route.ts`, `app/api/clips/[id]/route.ts`.
- **Pages**: `app/clips/page.tsx`, `app/clips/[id]/page.tsx`.
