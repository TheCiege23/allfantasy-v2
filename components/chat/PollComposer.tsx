"use client"

import { BarChart2 } from "lucide-react"

/**
 * Poll composer placeholder. Wire to POST .../polls or inline poll creation UI.
 */
export default function PollComposer() {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] transition-colors hover:bg-black/5"
      style={{ borderColor: "var(--border)", color: "var(--muted2)" }}
    >
      <BarChart2 className="h-3.5 w-3.5" />
      Create Poll
    </button>
  )
}
