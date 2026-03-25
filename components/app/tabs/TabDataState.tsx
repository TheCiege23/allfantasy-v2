'use client'

import type { ReactNode } from 'react'

export default function TabDataState({
  title,
  loading,
  error,
  children,
  onReload,
}: {
  title: string
  loading: boolean
  error: string | null
  children: ReactNode
  onReload?: () => void
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {onReload && (
          <button
            type="button"
            onClick={onReload}
            data-testid="tab-refresh-button"
            className="rounded-md border border-white/20 px-2 py-1 text-xs text-white/75 hover:bg-white/10"
          >
            Refresh
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-white/60">Loading...</p>}
      {!loading && error && <p className="text-sm text-red-300">{error}</p>}
      {!loading && !error && children}
    </section>
  )
}
