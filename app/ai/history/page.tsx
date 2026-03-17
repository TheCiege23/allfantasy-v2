'use client'

import React from 'react'
import Link from 'next/link'
import { LayoutGrid, ChevronLeft } from 'lucide-react'

/**
 * /ai/history — Saved AI results. Opens saved results; link from hub "Open saved".
 */
export default function AIHistoryPage() {
  return (
    <div className="mode-surface min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link
          href="/ai"
          className="mb-6 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white/90"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to AI
        </Link>
        <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] py-16 text-center">
          <LayoutGrid className="mb-4 h-12 w-12 text-white/30" aria-hidden />
          <h2 className="text-lg font-semibold text-white">History</h2>
          <p className="mt-2 max-w-sm text-sm text-white/50">
            Save a result from any AI tool (Trade Analyzer, Waiver, Draft, etc.) to see it here.
          </p>
          <Link
            href="/ai"
            className="mt-6 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
          >
            Go to AI
          </Link>
        </div>
      </div>
    </div>
  )
}
