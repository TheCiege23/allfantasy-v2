# PROMPT 290 — Final Polish Deliverable

**Objective:** Make the app feel premium.  
**Scope:** UI inconsistencies, animations, spacing, typography.  
**Date:** 2025-03-17

---

## 1. Standards (globals)

### 1.1 Transitions and interaction

Defined in `app/globals.css`:

| Token / class | Purpose |
|---------------|--------|
| `--transition-premium` | 200ms ease for buttons, links, cards |
| `--transition-slow` | 300ms ease for larger panels |
| `.transition-premium` | Standard interactive transition (color, bg, border, shadow, transform, opacity) |
| `.transition-premium-slow` | Same properties, 300ms |
| `.focus-ring` | `focus-visible` outline: 2px cyan, 2px offset (keyboard focus) |
| `.hover-lift` | Cards: translateY(-2px) + shadow on hover |

**Usage:** Add `transition-premium` (or `transition-premium-slow`) and `focus-ring` to interactive elements (links, buttons, tappable cards). Use `active:scale-[0.98]` for primary buttons for a subtle press feedback.

### 1.2 Spacing

| Token | Value | Use |
|-------|--------|-----|
| `--space-section` | 2rem | Vertical gap between major sections |
| `--space-card` | 1rem | Gap between cards or within a card |
| `--radius-card` | 0.75rem | Default card/panel radius (aligns with Tailwind `rounded-xl`) |
| `--radius-card-lg` | 1rem | Large cards (e.g. modals) |
| `--radius-button` | 0.75rem | Buttons and CTAs |

**Utility:** `.section-spacing` applies `margin-bottom: var(--space-section)`; `.section-spacing-tight` uses `--space-card`.

### 1.3 Typography

| Token | Use |
|-------|-----|
| `--leading-tight` | 1.25 — short headings |
| `--leading-snug` | 1.375 — subheadings |
| `--leading-balance` | 1.4 — multi-line body |
| `.text-balance` | `text-wrap: balance` for headings |

Existing `:root` text sizes: `--text-xs`, `--text-sm`, `--text-base`, `--text-lg`. Prefer these or Tailwind `text-xs` / `text-sm` / `text-base` consistently for body and labels.

---

## 2. Changes made

### 2.1 `app/globals.css`

- **Spacing/radius tokens:** `--space-section`, `--space-card`, `--radius-card`, `--radius-card-lg`, `--radius-button`.
- **Typography tokens:** `--leading-tight`, `--leading-snug`, `--leading-balance`.
- **Utilities:** `.section-spacing`, `.section-spacing-tight` for consistent vertical rhythm.

### 2.2 `components/dashboard/FinalDashboardClient.tsx`

- **Sign in / Sign up:** `transition-premium`, `focus-ring`, `touch-manipulation`; primary CTA also `active:scale-[0.98]`.
- **Status strip links** (tokens, pricing): `transition-premium`, `focus-ring`.
- **Quick action cards:** `transition-premium`, `focus-ring`, `touch-manipulation` (retained `active:scale-[0.98]`).
- **League links** (Discover, Create, All): `transition-premium`, `focus-ring`, padded hit area (`rounded px-1.5 py-0.5 -m-0.5`).
- **Error retry button, Create league CTA, league list rows, View all link:** `transition-premium`, `focus-ring`; buttons also `active:scale-[0.98]` and `touch-manipulation` where appropriate.

### 2.3 `components/landing/LandingHero.tsx`

- **Hero logo link:** `hover:opacity-90`, `active:scale-[0.98]`, `transition-premium`.
- **Primary CTA:** `transition-colors` replaced with `transition-premium`; added `active:scale-[0.98]`.
- **Secondary CTA:** `transition-colors` → `transition-premium`; added `hover:opacity-90`, `active:scale-[0.98]`.

### 2.4 `components/subscription/LockedFeatureCard.tsx`

- **Unlock / View plans button and "Or use N tokens" link:** `transition-premium`, `focus-ring`, `active:scale-[0.98]`, `touch-manipulation`.

---

## 3. UI consistency checklist

Use when adding or reviewing UI:

- [ ] **Interactive elements** — Use `transition-premium` (or `transition-premium-slow`) so hover/focus/active feel consistent.
- [ ] **Focus** — Add `focus-ring` (or equivalent `focus-visible` ring) for keyboard users.
- [ ] **Touch** — Primary buttons and tappable cards use `touch-manipulation` and optional `active:scale-[0.98]`.
- [ ] **Spacing** — Sections use consistent vertical gap (e.g. `mb-6` / `mb-8` or `.section-spacing`); card padding aligns with `--space-card` where applicable.
- [ ] **Radius** — Cards/panels use `rounded-xl` (or `rounded-2xl` for hero cards); buttons use `rounded-xl`.
- [ ] **Typography** — Headings use consistent scale (`text-sm` section titles, `text-xl`/`text-2xl` page titles); body `text-sm`/`text-base`; no placeholder or Lorem in shipped copy.

---

## 4. Optional follow-ups

- **Hover lift on cards:** Add `.hover-lift` to dashboard quick actions or league cards if a stronger “card lift” hover is desired (currently only transition + border brighten).
- **Reduced motion:** Consider `@media (prefers-reduced-motion: reduce)` to disable or shorten `transition-premium` and `active:scale` where appropriate.
- **Spread polish:** Apply `transition-premium` + `focus-ring` to other high-traffic components (e.g. nav links, settings buttons, Chimmy send button) for a consistent premium feel.
