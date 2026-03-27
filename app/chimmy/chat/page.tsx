'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { ChimmyChatShell } from '@/components/chimmy'

export default function ChimmyChatPage() {
  return (
    <main className="mode-surface min-h-screen px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/chimmy"
          className="mb-4 inline-flex items-center gap-2 text-sm text-white/65 hover:text-white/90"
          data-testid="chimmy-chat-back-link"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Chimmy
        </Link>
        <ChimmyChatShell
          sport="NFL"
          toolContext={{
            toolName: 'Chimmy',
            summary: 'Direct chat route',
            sport: 'NFL',
          }}
          className="min-h-[680px]"
        />
      </div>
    </main>
  )
}
