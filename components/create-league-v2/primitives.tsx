'use client'

/**
 * Shared UI primitives for the Create League v2 flow — glass surfaces,
 * pill selectors, toggles, and the animated step progress bar.
 *
 * Everything is Tailwind-first and reacts to a supplied `AccentTone`
 * from `lib/create-league-v2/theme.ts` so the whole page retunes its
 * glow as the user picks a league type.
 */

import type { ReactNode } from 'react'
import type { AccentTone } from '@/lib/create-league-v2/theme'
import { GLASS_INNER, GLASS_SURFACE } from '@/lib/create-league-v2/theme'
import type { V2PageId } from '@/lib/create-league-v2/state'
import { V2_PAGES, V2_PAGE_LABELS } from '@/lib/create-league-v2/state'

// ── Glass card shell ─────────────────────────────────────────────────

export function GlassCard({
  children,
  className = '',
  as: Tag = 'section',
}: {
  children: ReactNode
  className?: string
  as?: 'section' | 'div' | 'article'
}) {
  return <Tag className={`${GLASS_SURFACE} p-6 sm:p-8 ${className}`}>{children}</Tag>
}

export function InnerPanel({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`${GLASS_INNER} p-4 sm:p-5 ${className}`}>{children}</div>
}

// ── Section header ───────────────────────────────────────────────────

export function SectionHeader({
  title,
  hint,
  tooltip,
}: {
  title: string
  hint?: string
  tooltip?: string
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/60">{title}</h3>
        {hint ? <p className="mt-1 text-xs text-white/45">{hint}</p> : null}
      </div>
      {tooltip ? (
        <button
          type="button"
          title={tooltip}
          aria-label={tooltip}
          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[11px] text-white/60 hover:bg-white/10"
        >
          i
        </button>
      ) : null}
    </div>
  )
}

// ── Selectable card (for league type + scoring source) ──────────────

export function SelectableCard({
  selected,
  onClick,
  accent,
  title,
  subtitle,
  icon,
  disabled = false,
}: {
  selected: boolean
  onClick: () => void
  accent: AccentTone
  title: string
  subtitle?: string
  icon?: ReactNode
  disabled?: boolean
}) {
  const base =
    'group relative flex w-full flex-col items-start gap-1.5 rounded-2xl border p-4 text-left transition-all duration-200 ease-out'
  const stateClasses = disabled
    ? 'cursor-not-allowed border-white/5 bg-white/[0.02] text-white/30'
    : selected
      ? `cursor-pointer border-transparent ring-2 ${accent.ring} bg-white/[0.07] ${accent.glow}`
      : 'cursor-pointer border-white/10 bg-white/[0.03] hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]'

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${stateClasses}`}>
      {icon ? (
        <span
          className={`mb-1 inline-flex h-9 w-9 items-center justify-center rounded-xl text-base transition-colors ${
            selected ? `bg-white/10 ${accent.text}` : 'bg-white/[0.04] text-white/70'
          }`}
          aria-hidden
        >
          {icon}
        </span>
      ) : null}
      <span className={`text-sm font-semibold ${selected ? 'text-white' : 'text-white/85'}`}>{title}</span>
      {subtitle ? <span className="text-[11px] leading-snug text-white/50">{subtitle}</span> : null}
    </button>
  )
}

// ── Pill row (team count, draft type, tribes) ───────────────────────

export function PillRow<T extends string | number>({
  options,
  value,
  onChange,
  accent,
  ariaLabel,
  disabledValues,
}: {
  options: readonly T[]
  value: T
  onChange: (next: T) => void
  accent: AccentTone
  ariaLabel: string
  disabledValues?: readonly T[]
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = opt === value
        const disabled = disabledValues?.includes(opt) ?? false
        const stateClass = disabled
          ? 'cursor-not-allowed border-white/5 bg-white/[0.02] text-white/25'
          : selected
            ? `cursor-pointer border-transparent ring-2 ${accent.ring} bg-white/[0.08] ${accent.text} ${accent.glow}`
            : 'cursor-pointer border-white/10 bg-white/[0.03] text-white/80 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]'
        return (
          <button
            key={String(opt)}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-disabled={disabled}
            disabled={disabled}
            onClick={() => !disabled && onChange(opt)}
            className={`min-w-[3.25rem] rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-150 ${stateClass}`}
          >
            {String(opt)}
          </button>
        )
      })}
    </div>
  )
}

// ── Toggle switch ────────────────────────────────────────────────────

export function Toggle({
  checked,
  onChange,
  label,
  description,
  accent,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  description?: string
  accent: AccentTone
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <span className="flex-1">
        <span className="block text-sm font-semibold text-white">{label}</span>
        {description ? <span className="mt-1 block text-xs text-white/50">{description}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full border border-white/10 transition-all duration-200 ${
          checked ? `bg-white/15 ${accent.glow}` : 'bg-white/[0.04]'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full transition-all duration-200 ${
            checked ? `left-[calc(100%-1.375rem)] bg-white` : 'left-0.5 bg-white/60'
          }`}
        />
      </button>
    </label>
  )
}

// ── Text / textarea inputs ───────────────────────────────────────────

export function GlassInput({
  label,
  value,
  onChange,
  placeholder,
  accent,
  maxLength,
  hint,
  error,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  accent: AccentTone
  maxLength?: number
  hint?: string
  error?: string | null
  type?: 'text' | 'email'
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-white/50">{label}</span>
      <input
        type={type}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-xl border px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-all duration-150 ${
          error
            ? 'border-rose-400/50 bg-rose-500/5 focus:border-rose-300'
            : `border-white/10 bg-white/[0.04] focus:border-white/30 focus:${accent.ring} focus:ring-2`
        }`}
      />
      {error ? (
        <span className="mt-1 block text-[11px] text-rose-300">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[11px] text-white/40">{hint}</span>
      ) : null}
    </label>
  )
}

export function GlassTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  maxLength,
  accent,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  maxLength?: number
  accent: AccentTone
  hint?: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-white/50">{label}</span>
      <textarea
        value={value}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-all duration-150 focus:border-white/30 focus:${accent.ring} focus:ring-2`}
      />
      {hint ? <span className="mt-1 block text-[11px] text-white/40">{hint}</span> : null}
    </label>
  )
}

export function GlassSelect<T extends string>({
  label,
  value,
  onChange,
  options,
  accent,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: readonly { value: T; label: string }[]
  accent: AccentTone
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-white/50">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className={`w-full appearance-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 pr-10 text-sm text-white outline-none transition-all duration-150 focus:border-white/30 focus:${accent.ring} focus:ring-2`}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#0B0F1A] text-white">
              {opt.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/50">
          ▾
        </span>
      </div>
    </label>
  )
}

// ── Segmented control ────────────────────────────────────────────────

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accent,
  ariaLabel,
}: {
  options: readonly { value: T; label: string; hint?: string }[]
  value: T
  onChange: (v: T) => void
  accent: AccentTone
  ariaLabel: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1 sm:flex-row"
    >
      {options.map((opt) => {
        const selected = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all duration-150 ${
              selected
                ? `bg-white/10 text-white ring-1 ${accent.ring} ${accent.glow}`
                : 'text-white/65 hover:bg-white/[0.04] hover:text-white/90'
            }`}
          >
            <span className="block">{opt.label}</span>
            {opt.hint ? (
              <span className="mt-0.5 block text-[10px] font-normal text-white/45">{opt.hint}</span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

// ── Step progress ────────────────────────────────────────────────────

export function StepProgress({
  current,
  accent,
  onJump,
}: {
  current: V2PageId
  accent: AccentTone
  onJump?: (page: V2PageId) => void
}) {
  const currentIndex = V2_PAGES.indexOf(current)
  return (
    <div className="sticky top-0 z-20 border-b border-white/10 bg-[#0B0F1A]/80 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto max-w-3xl">
        <div className="mb-2 flex items-center justify-between">
          {V2_PAGES.map((page, i) => {
            const reached = i <= currentIndex
            const isCurrent = page === current
            return (
              <button
                key={page}
                type="button"
                disabled={!onJump || i > currentIndex}
                onClick={() => onJump?.(page)}
                className="flex flex-1 items-center gap-2 text-left"
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-all duration-200 ${
                    isCurrent
                      ? `border-transparent bg-white text-[#0B0F1A] ring-2 ${accent.ring} ${accent.glow}`
                      : reached
                        ? `border-white/20 bg-white/10 ${accent.text}`
                        : 'border-white/10 bg-white/[0.02] text-white/40'
                  }`}
                >
                  {i + 1}
                </span>
                <span
                  className={`hidden text-[11px] font-semibold uppercase tracking-wider sm:inline ${
                    isCurrent ? 'text-white' : reached ? 'text-white/70' : 'text-white/35'
                  }`}
                >
                  {V2_PAGE_LABELS[page]}
                </span>
                {i < V2_PAGES.length - 1 ? (
                  <span className="mx-1 hidden h-px flex-1 bg-white/10 sm:block" />
                ) : null}
              </button>
            )
          })}
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-white/[0.05]">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${((currentIndex + 1) / V2_PAGES.length) * 100}%`,
              background: `linear-gradient(90deg, ${accent.hexSoft}, ${accent.hex})`,
              boxShadow: `0 0 20px -2px ${accent.hex}`,
            }}
          />
        </div>
      </div>
    </div>
  )
}

// ── Primary CTA ──────────────────────────────────────────────────────

export function PrimaryCTA({
  children,
  onClick,
  disabled = false,
  loading = false,
  accent,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  accent: AccentTone
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`group relative inline-flex h-12 w-full items-center justify-center overflow-hidden rounded-2xl px-6 text-sm font-bold uppercase tracking-wider text-white transition-all duration-200 sm:w-auto sm:min-w-[16rem] ${
        disabled || loading
          ? 'cursor-not-allowed bg-white/5 text-white/40'
          : `cursor-pointer ${accent.glow} hover:scale-[1.02] active:scale-[0.98]`
      }`}
      style={
        disabled || loading
          ? undefined
          : { background: `linear-gradient(135deg, ${accent.hex}, ${accent.hexSoft})` }
      }
    >
      <span className="relative z-10 flex items-center gap-2">
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : null}
        {children}
      </span>
    </button>
  )
}

export function SecondaryButton({
  children,
  onClick,
  disabled = false,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] px-6 text-sm font-semibold text-white/80 transition-all duration-150 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  )
}
