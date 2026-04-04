'use client'

/** Commissioner control primitives. Sport-specific defaults & toggles metadata: `GET /api/sport-config?sport=NFL`. */

import type { ReactNode } from 'react'

export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="border-b border-white/[0.06] px-4 py-5">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {description ? <p className="mt-1 text-[12px] text-white/45">{description}</p> : null}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

export function SettingsRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-[13px] text-white/70">{label}</span>
      <div className="min-w-0 sm:text-right">{children}</div>
    </div>
  )
}
