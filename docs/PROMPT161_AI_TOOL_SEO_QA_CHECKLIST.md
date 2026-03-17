# PROMPT 161 — AI Tool SEO Landing Pages QA Checklist

## Routes

| Tool                 | SEO page route        | Open tool href (CTA)     |
|----------------------|------------------------|---------------------------|
| Trade Analyzer       | /trade-analyzer        | /trade-evaluator          |
| Waiver Wire AI       | /waiver-wire           | /waiver-ai                |
| Draft Helper         | /draft-helper          | /mock-draft               |
| Player Comparison Lab| /player-comparison     | /player-comparison-lab    |
| Matchup Simulator    | /matchup-simulator     | /app/simulation-lab       |
| Fantasy Coach        | /fantasy-coach         | /app/coach                 |

## Mandatory click audit

### Tool pages route correctly

- [ ] **/trade-analyzer** — Loads SEO landing; headline “Trade Analyzer”; benefits and example section present.
- [ ] **/waiver-wire** — Loads SEO landing; headline “Waiver Wire AI”.
- [ ] **/draft-helper** — Loads SEO landing; headline “Draft Helper”.
- [ ] **/player-comparison** — Loads SEO landing; headline “Player Comparison Lab”.
- [ ] **/matchup-simulator** — Loads SEO landing; headline “Matchup Simulator”.
- [ ] **/fantasy-coach** — Loads SEO landing; headline “Fantasy Coach”.

### CTA buttons open app

- [ ] **Open AllFantasy App** (primary CTA on each page) — Links to **/app**; no dead link.
- [ ] **Open [Tool Name]** (secondary CTA) — Links to the correct tool URL for that page:
  - Trade Analyzer → /trade-evaluator
  - Waiver Wire AI → /waiver-ai
  - Draft Helper → /mock-draft
  - Player Comparison Lab → /player-comparison-lab
  - Matchup Simulator → /app/simulation-lab
  - Fantasy Coach → /app/coach
- [ ] **Final section “Open AllFantasy App”** — Also links to **/app**.

## Content (each page)

- [ ] Tool explanation (headline + body paragraph).
- [ ] Benefits list (checkmarks).
- [ ] Example section (placeholder or screenshot area + “Open tool” link).
- [ ] At least one primary CTA to open AllFantasy App (/app).

## Files

| File | Role |
|------|------|
| `components/seo/AIToolSeoLanding.tsx` | Shared layout: hero, benefits, example area, CTAs to /app and openToolHref |
| `lib/seo-landing/ai-tool-pages.ts` | Config for all 6 tools: title, description, headline, body, benefits, openToolHref, openToolLabel |
| `app/trade-analyzer/page.tsx` | Trade Analyzer SEO page |
| `app/waiver-wire/page.tsx` | Waiver Wire AI SEO page |
| `app/draft-helper/page.tsx` | Draft Helper SEO page |
| `app/player-comparison/page.tsx` | Player Comparison Lab SEO page |
| `app/matchup-simulator/page.tsx` | Matchup Simulator SEO page |
| `app/fantasy-coach/page.tsx` | Fantasy Coach SEO page |
