/**
 * Premium Create League v2 — visual design tokens.
 *
 * The spec asks for a dark cinematic base with glassmorphism panels and a
 * dynamic accent color that tints the whole page based on the selected
 * league type. Keeping this as a plain object (vs. CSS vars) so Tailwind
 * arbitrary-value classes can consume it inline.
 */

import type { LeagueTypeId } from '@/lib/league-creation-wizard/types'

export type AccentTone = {
  /** Short label used in aria / tooltip. */
  label: string
  /** Tailwind color stop used for primary text / glow. */
  text: string
  /** Solid hex used in gradient stops. */
  hex: string
  /** Secondary hex for the gradient tail. */
  hexSoft: string
  /** Ring / border color for selected cards. */
  ring: string
  /** Glow shadow for selected cards (tailwind-compatible arbitrary shadow). */
  glow: string
}

export const ACCENTS: Record<LeagueTypeId, AccentTone> = {
  redraft: {
    label: 'Electric Blue',
    text: 'text-sky-300',
    hex: '#3B82F6',
    hexSoft: '#1E3A8A',
    ring: 'ring-sky-400/60',
    glow: 'shadow-[0_0_40px_-8px_rgba(59,130,246,0.55)]',
  },
  dynasty: {
    label: 'Royal Violet',
    text: 'text-violet-300',
    hex: '#8B5CF6',
    hexSoft: '#4C1D95',
    ring: 'ring-violet-400/60',
    glow: 'shadow-[0_0_40px_-8px_rgba(139,92,246,0.55)]',
  },
  keeper: {
    label: 'Amber Gold',
    text: 'text-amber-300',
    hex: '#F59E0B',
    hexSoft: '#78350F',
    ring: 'ring-amber-400/60',
    glow: 'shadow-[0_0_40px_-8px_rgba(245,158,11,0.55)]',
  },
  best_ball: {
    label: 'Cyan',
    text: 'text-cyan-300',
    hex: '#06B6D4',
    hexSoft: '#164E63',
    ring: 'ring-cyan-400/60',
    glow: 'shadow-[0_0_40px_-8px_rgba(6,182,212,0.55)]',
  },
  survivor: {
    label: 'Emerald',
    text: 'text-emerald-300',
    hex: '#10B981',
    hexSoft: '#064E3B',
    ring: 'ring-emerald-400/60',
    glow: 'shadow-[0_0_40px_-8px_rgba(16,185,129,0.55)]',
  },
  guillotine: {
    label: 'Crimson',
    text: 'text-rose-300',
    hex: '#F43F5E',
    hexSoft: '#881337',
    ring: 'ring-rose-400/60',
    glow: 'shadow-[0_0_40px_-8px_rgba(244,63,94,0.55)]',
  },
  salary_cap: {
    label: 'Emerald Gold',
    text: 'text-emerald-200',
    hex: '#34D399',
    hexSoft: '#065F46',
    ring: 'ring-emerald-300/60',
    glow: 'shadow-[0_0_40px_-8px_rgba(52,211,153,0.55)]',
  },
  tournament: {
    label: 'Amber',
    text: 'text-orange-300',
    hex: '#F97316',
    hexSoft: '#7C2D12',
    ring: 'ring-orange-400/60',
    glow: 'shadow-[0_0_40px_-8px_rgba(249,115,22,0.55)]',
  },
  devy: {
    label: 'Teal',
    text: 'text-teal-300',
    hex: '#14B8A6',
    hexSoft: '#134E4A',
    ring: 'ring-teal-400/60',
    glow: 'shadow-[0_0_40px_-8px_rgba(20,184,166,0.55)]',
  },
  c2c: {
    label: 'Sky',
    text: 'text-sky-200',
    hex: '#0EA5E9',
    hexSoft: '#0C4A6E',
    ring: 'ring-sky-300/60',
    glow: 'shadow-[0_0_40px_-8px_rgba(14,165,233,0.55)]',
  },
  zombie: {
    label: 'Toxic Green',
    text: 'text-lime-300',
    hex: '#84CC16',
    hexSoft: '#365314',
    ring: 'ring-lime-400/60',
    glow: 'shadow-[0_0_40px_-8px_rgba(132,204,22,0.55)]',
  },
  big_brother: {
    label: 'Fuchsia',
    text: 'text-fuchsia-300',
    hex: '#D946EF',
    hexSoft: '#701A75',
    ring: 'ring-fuchsia-400/60',
    glow: 'shadow-[0_0_40px_-8px_rgba(217,70,239,0.55)]',
  },
}

export const DEFAULT_ACCENT: AccentTone = ACCENTS.redraft

export function getAccent(leagueType: LeagueTypeId | null | undefined): AccentTone {
  if (!leagueType) return DEFAULT_ACCENT
  return ACCENTS[leagueType] ?? DEFAULT_ACCENT
}

/** Page background — layered cinematic mesh with deep galaxy vignette. */
export const PAGE_BG_CLASS =
  'min-h-screen bg-[#060a18] bg-[radial-gradient(ellipse_120%_60%_at_50%_-15%,rgba(30,60,140,0.45),transparent_70%),radial-gradient(ellipse_80%_50%_at_80%_100%,rgba(15,25,80,0.3),transparent_60%),radial-gradient(ellipse_60%_40%_at_20%_80%,rgba(10,20,60,0.25),transparent_50%)] text-white'

/** Glass surface — frosted panel with layered depth and subtle inner shine. */
export const GLASS_SURFACE =
  'rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-2xl shadow-[0_24px_80px_-20px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.06)]'

/** Softer surface for inner sub-panels with subtle depth. */
export const GLASS_INNER =
  'rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-white/[0.015] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'

/** Ambient glow overlay — position behind content, tinted by accent hex. */
export function ambientGlowStyle(hex: string): React.CSSProperties {
  return {
    background: `radial-gradient(600px circle at 50% 0%, ${hex}12, transparent 70%)`,
    pointerEvents: 'none' as const,
  }
}

// ── Media registry for videos + posters ─────────────────────────────
// Every file path below resolves to /public/<file>. Missing files fall back gracefully via onError.

export type MediaAsset = {
  video: string
  poster?: string
  fallback?: string
}

/** Per-sport ambient loop shown on the Sport section. */
export const SPORT_MEDIA: Record<string, MediaAsset> = {
  NFL: { video: '/Football.mp4', poster: '/Football.png', fallback: '/af-crest.png' },
  NBA: { video: '/Basketball.mp4', poster: '/Basketball.png', fallback: '/af-crest.png' },
  MLB: { video: '/Baseball.mp4', poster: '/Baseball.png', fallback: '/af-crest.png' },
  NHL: { video: '/Hockey.mp4', poster: '/Hockey.png', fallback: '/af-crest.png' },
  NCAAF: { video: '/Football.mp4', poster: '/Football.png', fallback: '/af-crest.png' },
  NCAAB: { video: '/Basketball.mp4', poster: '/Basketball.png', fallback: '/af-crest.png' },
  SOCCER: { video: '/Soccer.mp4', poster: '/Soccer.png', fallback: '/af-crest.png' },
}

/**
 * Per-league-type hero. Uses the cinematic "-intro" clip where available,
 * otherwise falls back to the shorter loop. IDP and tournament reuse the
 * redraft hero (IDP is a redraft variant, tournament has no -intro).
 */
export const LEAGUE_TYPE_MEDIA: Record<string, MediaAsset> = {
  redraft: { video: '/league-type-redraft-intro.mp4', fallback: '/af-crest.png' },
  dynasty: { video: '/league-type-dynasty-intro.mp4', fallback: '/league-type-dynasty.mp4' },
  keeper: { video: '/league-type-keeper-intro.mp4', fallback: '/league-type-keeper.mp4' },
  best_ball: { video: '/league-type-best-ball-intro.mp4', fallback: '/league-type-best-ball.mp4' },
  idp: { video: '/league-type-idp-intro.mp4', fallback: '/league-type-idp.mp4' },
  salary_cap: { video: '/league-type-salary-cap-intro.mp4', fallback: '/league-type-salary-cap.mp4' },
  devy: { video: '/league-type-devy-intro.mp4', fallback: '/league-type-devy.mp4' },
  c2c: { video: '/league-type-c2c-intro.mp4', fallback: '/league-type-c2c.mp4' },
  guillotine: { video: '/league-type-guillotine-intro.mp4', fallback: '/league-type-guillotine.mp4' },
  zombie: { video: '/league-type-zombie-intro.mp4', fallback: '/league-type-zombie.mp4' },
  survivor: { video: '/league-type-survivor-intro.mp4', fallback: '/league-type-survivor.mp4' },
  tournament: { video: '/league-type-tournament.mp4', fallback: '/af-crest.png' },
  big_brother: { video: '/league-type-big-brother-intro.mp4', fallback: '/league-type-big-brother.mp4' },
}
