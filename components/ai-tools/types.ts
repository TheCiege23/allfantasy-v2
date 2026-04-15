/**
 * Shared types for the AI Tools widget system.
 *
 * These types describe the common shape of a tool's runtime state and
 * per-tool UI metadata so every card + modal can speak the same language
 * regardless of whether it's wired to a real API or to structured
 * placeholder data.
 */

import type { ReactNode } from 'react'

// ── Freshness / live status ──────────────────────────────────────────

/**
 * How "fresh" a tool's data is. Drives the card's live indicator pill
 * and the "AI ready" pulsing dot in the corner of each card.
 */
export type FreshnessStatus = 'live' | 'recent' | 'stale' | 'idle'

export type FreshnessBadge = {
  status: FreshnessStatus
  /** Short human label, e.g. "Live", "3m ago", "Syncing", "Idle". */
  label: string
}

// ── Per-tool generic runtime state ──────────────────────────────────

/**
 * Generic state envelope for any tool. Modals use this to render
 * loading / error / empty / ready branches with a single shape.
 */
export type ToolState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'empty'; reason?: string }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T }

// ── Priority / urgency / confidence dials ───────────────────────────

export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low'
export type ConfidenceLevel = 'high' | 'medium' | 'low'
export type TradeLean = 'buy' | 'sell' | 'hold'
export type Direction = 'up' | 'down' | 'flat'

// ── Tool card metadata ──────────────────────────────────────────────

export type AIToolAccent =
  | 'cyan'
  | 'purple'
  | 'amber'
  | 'emerald'
  | 'red'
  | 'rose'
  | 'violet'
  | 'sky'

/**
 * The full config driving a tool card on the dashboard grid. Everything
 * optional beyond id/title/icon/accent can be filled in by the parent
 * grid when live data is plumbed in.
 */
export type AIToolCardConfig = {
  id: string
  title: string
  /** One-line purpose — not a slogan, a functional description. */
  subtitle: string
  /** React icon node; pick from lucide-react. */
  icon: ReactNode
  accent: AIToolAccent
  /** Card status chip. 'new' overrides to a "New" badge. */
  status?: 'ready' | 'loading' | 'new'
  /** Optional one-line preview insight shown under the subtitle. */
  insight?: string | null
  /** Live freshness pill (e.g. "3m ago"). */
  freshness?: FreshnessBadge | null
}
