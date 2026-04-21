'use client'

import clsx from 'clsx'
import type { ReactNode } from 'react'

/** Reference-style section label (uppercase, muted). */
export function SettingsSectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={clsx('mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45', className)}>{children}</p>
  )
}

export function SettingsPanelHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-6 border-b border-white/[0.08] pb-4">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {subtitle ? <p className="mt-1 text-[13px] text-white/50">{subtitle}</p> : null}
    </header>
  )
}

export function SettingsHelper({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-[11px] leading-relaxed text-white/40">{children}</p>
}

/** Pill select + inputs matching reference dark controls. */
export const controlClass =
  'w-full max-w-md rounded-full border border-white/[0.12] bg-[#141a24] px-4 py-2.5 text-[13px] text-white outline-none transition-colors focus:border-teal-400/40 disabled:opacity-45'

export const controlClassSm = 'rounded-full border border-white/[0.12] bg-[#141a24] px-3 py-2 text-[13px] text-white outline-none focus:border-teal-400/40 disabled:opacity-45'

export function SettingsToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
  dimmed,
}: {
  label: string
  description?: string
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
  dimmed?: boolean
}) {
  return (
    <label
      className={clsx(
        'flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3 transition-colors hover:bg-white/[0.03]',
        dimmed && 'opacity-50',
      )}
    >
      <span className="min-w-0">
        <span className="block text-[12px] font-medium uppercase tracking-wide text-white/75">{label}</span>
        {description ? <span className="mt-0.5 block text-[11px] text-white/40">{description}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={clsx(
          'relative h-7 w-12 shrink-0 rounded-full transition-colors',
          checked ? 'bg-teal-500/90' : 'bg-white/15',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <span
          className={clsx(
            'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5',
          )}
        />
      </button>
    </label>
  )
}

export function SettingsRadioGroup<T extends string>({
  name,
  value,
  onChange,
  disabled,
  options,
}: {
  name: string
  value: T
  onChange: (v: T) => void
  disabled?: boolean
  options: { id: T; title: string; description?: string }[]
}) {
  return (
    <div className="space-y-3" role="radiogroup" aria-label={name}>
      {options.map((opt) => {
        const selected = value === opt.id
        return (
          <label
            key={opt.id}
            className={clsx(
              'flex cursor-pointer gap-3 rounded-xl border px-4 py-3 transition-colors',
              selected ? 'border-teal-400/35 bg-teal-500/10' : 'border-white/[0.08] bg-black/15 hover:bg-white/[0.04]',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            <input
              type="radio"
              name={name}
              className="mt-1 h-4 w-4 border-white/30 text-teal-500 focus:ring-teal-400/50"
              checked={selected}
              disabled={disabled}
              onChange={() => onChange(opt.id)}
            />
            <span>
              <span className="block text-[13px] font-semibold text-white">{opt.title}</span>
              {opt.description ? <span className="mt-1 block text-[12px] text-white/45">{opt.description}</span> : null}
            </span>
          </label>
        )
      })}
    </div>
  )
}
