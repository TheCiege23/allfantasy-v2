# PROMPT 282 — SEO and Landing Page Optimization Deliverable

## Objective

Convert visitors fast with a minimal landing that explains the app in ~3 seconds, shows features, shows AI value, and uses a strong CTA.

---

## Minimal Design Delivered

- **Big logo** — Hero uses a large AllFantasy crest (96px mobile → 200px desktop) as the main visual; LCP image with `priority`.
- **Simple message** — One headline: *"Fantasy sports with AI. Draft, trade, waivers—win."* (Larger type: text-2xl → lg:text-5xl.) One subline: *"Leagues, brackets & AI tools for NFL, NBA, MLB, NHL, NCAA, Soccer."* Trust line under CTAs: *"Free to start · No credit card"* to reduce signup friction.
- **Clear buttons** — Two CTAs only: **Open AllFantasy App** (primary, emerald) and **Create Free Account** (secondary, outlined). Min height 52px, full-width on mobile, `touch-manipulation` for fast taps. Same treatment in Final CTA section.

---

## Structure (3-second explain → features → AI value → CTA)

1. **Hero** — Logo → headline → subline → primary + secondary CTAs → trust line ("Free to start · No credit card"). More vertical padding (py-14 → md:py-24). Explains the product in ~3 seconds.
2. **Features** — "What you get" + subline "Leagues, drafts, trades, waivers—all in one place." Six minimal tiles (Leagues & brackets, Draft assistant, Trade analyzer, Waiver AI, Player comparison, AI coach) with min-height and touch-manipulation; each links to the relevant page.
3. **AI value** — "AI that helps you win" with 4 cards (Trade fairness, Waiver picks, Draft suggestions, Chimmy assistant); touch-friendly tap targets.
4. **Final CTA** — "Start Winning Your League" with the same two buttons at 52px height, full-width on mobile, touch-manipulation.
5. **Footer** — Logo, sports list, App / Sign up / Sign in / Tools Hub / Privacy / Terms.

---

## Key Files

| File | Role |
|------|------|
| `app/page.tsx` | Root landing: Nav → Hero → FeaturesMinimal → AIValue → FinalCTA → footer. Dynamic imports for below-fold sections. |
| `components/landing/LandingHero.tsx` | Big logo, headline, subline, two CTAs, trust line; larger type and padding. |
| `components/landing/LandingFeaturesMinimal.tsx` | "What you get" + subline; 6 feature tiles (min-height, touch-manipulation). |
| `components/landing/LandingAIValue.tsx` | "AI that helps you win" (4 value cards; touch-friendly). |
| `components/landing/LandingFinalCTA.tsx` | Strong closing CTA; 52px buttons, full-width on mobile, touch-manipulation. |
| `lib/landing-cta.ts` | Single source for primary/secondary CTA labels and hrefs. |
| `lib/landing-analytics.ts` | CTA click tracking. |

---

## Removed for Minimal Flow

- **ToolPreviewCards** — Replaced by Features + AI value (no duplicate tool previews).
- **LandingScreenPreviews** — Omitted for a shorter, focused scroll.
- **LandingSocialProof** — Omitted; can be re-added later as one line or a compact bar.

Existing components (`LandingFeatureCards`, `ToolPreviewCards`, `LandingSocialProof`, `LandingScreenPreviews`) remain in the codebase for use elsewhere; only the root landing composition was changed.

---

## SEO

- Root layout metadata (title, description, OG) unchanged.
- In-page JSON-LD updated to match the new headline/description.
- Canonical and structure remain intact for crawlers.
