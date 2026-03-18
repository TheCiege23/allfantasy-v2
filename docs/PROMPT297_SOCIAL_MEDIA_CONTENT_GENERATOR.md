# PROMPT 297 — Social Media Content Generator

## Objective

Generate posts for users automatically: ready-to-post captions and image for social media.

## Content types

- **Draft results** — Winner, grade, league/season, highlight.
- **Weekly recap** — Week, league, record (wins–losses), highlight/summary.
- **Trade reactions** — Side A vs Side B, grade, verdict/insight.
- **Power rankings** — League, rank, team name, change, blurb/insight.

## Format

- **Ready-to-post caption**: Copy-paste text including the required hashtags.
- **Image**: Card (600×400) matching the content type (draft card, AI insight card for trade/power rankings, or social post card for weekly recap). Download as PNG.

## Required hashtags

All generated captions include:

`#fantasyfootball #NFL #football #fantasyfootballadvice #sports #nflnews #fantasyfootballdraft`

Defined in `lib/social-content-generator/constants.ts` as `REQUIRED_HASHTAGS` and appended to every caption.

## Deliverable: Content generator

### Engine (lib/social-content-generator/)

- **constants.ts** — `REQUIRED_HASHTAGS`, `REQUIRED_HASHTAGS_STRING`.
- **types.ts** — `SocialContentType`, context types per content type, `SocialContentResult` (caption, hashtags, title, bodyLines, cardType, cardPayload).
- **templates.ts** — Caption templates per type; `getCaptionForType(type, data)` returns caption with hashtags appended.
- **generator.ts** — `generateCaption(context)` and `generateContent(context)`; latter returns caption + cardType + cardPayload for rendering the correct card (draft, trade_grade, power_rankings, weekly_recap).
- **index.ts** — Re-exports.

### Cards

- **SocialPostCard** — Generic card for weekly recap (title, body lines, league name, week, required hashtags, AllFantasy branding). Used when `cardType === 'weekly_recap'`.
- Draft results use **DraftShareCard** (draft_winner payload).
- Trade reaction and power rankings use **AICardRenderer** (trade_grade / power_rankings payload).

### API

- **POST /api/social-content/generate** — Body: `{ type: SocialContentType, data: context }`. Returns `{ caption, hashtags, title, bodyLines, cardType, cardPayload }`. Auth required.

### UI

- **SocialContentGenerator** — Content type selector; form fields per type; “Generate post” calls API; shows caption (with “Copy caption”) and the appropriate card with “Download image”.
- **Page** — `/app/social-content` renders the generator inside a card.

### Flow

1. User selects content type (draft results, weekly recap, trade reaction, power rankings).
2. User fills context (league name, winner, grade, week, record, sides, rank, etc.).
3. User clicks “Generate post”.
4. API returns caption (with required hashtags) and card payload.
5. User can “Copy caption” and “Download image” to post on social media.

## Files

- **Engine**: `lib/social-content-generator/constants.ts`, `types.ts`, `templates.ts`, `generator.ts`, `index.ts`
- **Components**: `components/social-content/SocialPostCard.tsx`, `SocialContentGenerator.tsx`, `index.ts`
- **API**: `app/api/social-content/generate/route.ts`
- **Page**: `app/app/social-content/page.tsx`

## Summary

- **Content generator**: Four content types with template-based captions and required hashtags.
- **Format**: Ready-to-post caption + matching image card (draft / trade / power rankings / weekly recap).
- **Hashtags**: #fantasyfootball #NFL #football #fantasyfootballadvice #sports #nflnews #fantasyfootballdraft on every post.
