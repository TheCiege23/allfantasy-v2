# PROMPT 162 — Sport SEO Landing Pages QA Checklist

## Supported sports → pages

| Sport            | Page route          |
|------------------|---------------------|
| NFL              | /fantasy-football   |
| NBA              | /fantasy-basketball |
| MLB              | /fantasy-baseball   |
| NHL              | /fantasy-hockey     |
| Soccer           | /fantasy-soccer     |
| NCAA Basketball  | /fantasy-ncaa (combined) |
| NCAA Football    | /fantasy-ncaa (combined) |

## Content (each page)

- [ ] **Sport overview** — Headline + body paragraph.
- [ ] **Tools available** — List of tool links (Trade Analyzer, Waiver Advisor, Sports App, etc.).
- [ ] **CTA to open app** — “Open AllFantasy App” button linking to **/app**.

## Mandatory click audit

- [ ] **/fantasy-football** — Loads; overview, tools list, CTA to /app works.
- [ ] **/fantasy-basketball** — Loads; CTA to /app works.
- [ ] **/fantasy-baseball** — Loads; CTA to /app works.
- [ ] **/fantasy-hockey** — Loads; CTA to /app works.
- [ ] **/fantasy-soccer** — Loads; CTA to /app works.
- [ ] **/fantasy-ncaa** — Loads; covers NCAA Basketball & Football; CTA to /app works.
- [ ] **CTA “Open AllFantasy App”** on each page — Links to **/app** (no dead link).
- [ ] **Tool links** in “Tools available” — Each goes to the correct route (e.g. /trade-analyzer, /waiver-ai, /app).

## Files

| File | Role |
|------|------|
| `lib/seo-landing/sport-pages.ts` | SportSeoPageConfig; SPORT_PAGE_CONFIG for 6 routes; fantasy-ncaa combined config |
| `components/seo/SportSeoLanding.tsx` | Shared layout: overview, tools list, CTA to /app |
| `app/fantasy-football/page.tsx` | NFL sport SEO page |
| `app/fantasy-basketball/page.tsx` | NBA sport SEO page |
| `app/fantasy-baseball/page.tsx` | MLB sport SEO page |
| `app/fantasy-hockey/page.tsx` | NHL sport SEO page |
| `app/fantasy-soccer/page.tsx` | Soccer sport SEO page |
| `app/fantasy-ncaa/page.tsx` | NCAA Basketball + NCAA Football combined SEO page |
