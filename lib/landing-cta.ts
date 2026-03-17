/**
 * PROMPT 166 — Conversion CTA system.
 * Single source of truth for primary/secondary CTAs and routing.
 */

export const CONVERSION_CTA = {
  /** Primary: Open AllFantasy App → /app */
  primary: {
    label: 'Open AllFantasy App',
    href: '/app',
  },
  /** Secondary: Create Free Account → /signup */
  secondary: {
    label: 'Create Free Account',
    href: '/signup',
  },
} as const
