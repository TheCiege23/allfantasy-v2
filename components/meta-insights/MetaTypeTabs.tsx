"use client"

import type { MetaTabId } from "./MetaInsightsDashboard"

const TABS: { id: MetaTabId; label: string }[] = [
  { id: "draft", label: "Draft meta" },
  { id: "waiver", label: "Waiver meta" },
  { id: "trade", label: "Trade meta" },
  { id: "roster", label: "Roster meta" },
  { id: "strategy", label: "Strategy meta" },
]

export function MetaTypeTabs({
  value,
  onChange,
}: {
  value: MetaTabId
  onChange: (tab: MetaTabId) => void
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800/50">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            value === tab.id
              ? "bg-white text-slate-900 shadow dark:bg-slate-700 dark:text-slate-100"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
          aria-selected={value === tab.id}
          aria-label={`View ${tab.label}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
