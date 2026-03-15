"use client"

export function RefreshButton({ onRefresh }: { onRefresh: () => void }) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      className="rounded border border-slate-300 bg-white px-2 py-1 text-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      aria-label="Refresh meta data"
    >
      Refresh
    </button>
  )
}
