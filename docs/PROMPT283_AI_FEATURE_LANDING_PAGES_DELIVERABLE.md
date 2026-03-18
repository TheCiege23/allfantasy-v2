# PROMPT 283 — AI Feature Landing Pages Deliverable

## Objective

Create SEO + conversion feature pages for: Trade Analyzer, Waiver AI, Draft AI, War Room, AI Chat.

---

## Feature Pages (SEO + Conversion)

| Feature      | Route             | Purpose                    | CTA → Tool / Destination   |
|-------------|-------------------|----------------------------|-----------------------------|
| Trade Analyzer | `/trade-analyzer` | SEO landing + conversion   | Open App, Open Trade Analyzer → `/trade-evaluator` |
| Waiver AI   | `/waiver-wire`    | SEO landing + conversion   | Open App, Open Waiver Wire AI → `/waiver-ai`         |
| Draft AI    | `/draft-helper`   | SEO landing + conversion   | Open App, Open Draft Helper → `/mock-draft`         |
| War Room    | `/war-room`       | SEO landing + conversion   | Open App, Open War Room → `/mock-draft`             |
| AI Chat     | `/ai-chat`        | SEO landing + conversion   | Open App, Chat with Chimmy → `/chimmy`              |

Each page uses the shared **AIToolSeoLanding** component: headline, body, benefits list, dual CTAs (Open AllFantasy App + Open tool), example placeholder, and footer. Metadata (title, description, canonical, OG, Twitter) is built via **buildSeoMeta**; **LandingToolVisitTracker** records visits for conversion analytics. Each page includes **WebPage JSON-LD** via **getAIToolPageJsonLd(slug)** for richer SEO. CTAs use **min-h-[52px]**, **touch-manipulation**, and full-width on mobile for conversion consistency with the main landing.

---

## Config Source

All copy and links live in **`lib/seo-landing/ai-tool-pages.ts`**:

- **trade-analyzer** — AI trade grades, lineup impact, counter-offers; redraft + dynasty.
- **waiver-wire** — Waiver/free-agent priorities, lineup optimization, league context.
- **draft-helper** — Mock drafts, AI pick suggestions, Chimmy; snake + auction.
- **war-room** (new) — Draft command center: real-time board, AI picks, Chimmy in-draft.
- **ai-chat** (new) — Chimmy: draft help, trade analysis, waiver advice, matchup predictions.

Slugs **war-room** and **ai-chat** were added to **AI_TOOL_PAGES** and **AI_TOOL_PAGE_SLUGS**; canonicals use **getAIToolPageCanonical(slug)**.

---

## Key Files

| File | Role |
|------|------|
| `app/trade-analyzer/page.tsx` | Trade Analyzer SEO landing + tracker |
| `app/waiver-wire/page.tsx`   | Waiver AI SEO landing + tracker (metadata aligned with buildSeoMeta) |
| `app/draft-helper/page.tsx`  | Draft AI SEO landing + tracker (metadata aligned) |
| `app/war-room/page.tsx`      | **New** — Draft War Room SEO landing + tracker |
| `app/ai-chat/page.tsx`       | **New** — AI Chat (Chimmy) SEO landing + tracker |
| `app/chimmy/page.tsx`        | Chimmy-specific landing (existing); /ai-chat is an alternate SEO entry |
| `lib/seo-landing/ai-tool-pages.ts` | Config for all AI tool pages (incl. war-room, ai-chat) |
| `components/seo/AIToolSeoLanding.tsx` | Shared layout: hero, benefits, CTAs, footer; 52px primary CTAs, touch-manipulation |
| `lib/seo-landing/ai-tool-pages.ts` | **getAIToolPageJsonLd(slug)** — WebPage JSON-LD for each AI tool page |

---

## Tool vs Landing Routes

- **Trade Analyzer:** Landing at `/trade-analyzer`, tool at `/trade-evaluator`.
- **Waiver AI:** Landing at `/waiver-wire`, tool at `/waiver-ai`.
- **Draft AI / War Room:** Landings at `/draft-helper` and `/war-room`; both link to `/mock-draft`.
- **AI Chat:** Landing at `/ai-chat`; links to `/chimmy` (Chimmy also has its own landing at `/chimmy`).

---

## SEO

- Each page has unique **title** and **description** in config; **canonical** and **OG/Twitter** are set via **buildSeoMeta**.
- **WebPage** JSON-LD (name, description, url, isPartOf WebSite) is injected via **getAIToolPageJsonLd(slug)** in each of the five feature pages.
- **LandingToolVisitTracker** logs the landing path and tool name for conversion analysis.
