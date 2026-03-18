'use client'

import { useState } from 'react'
import { MessageSquare, Pin } from 'lucide-react'

export interface ZombieUniverseForumClientProps {
  universeId: string
}

export function ZombieUniverseForumClient({ universeId }: ZombieUniverseForumClientProps) {
  const [pinned] = useState<{ id: string; title: string; body: string }[]>([])
  const [threads] = useState<{ id: string; title: string; updated: string }[]>([])

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <Pin className="h-5 w-5 text-amber-400" />
          Pinned updates
        </h2>
        {pinned.length === 0 ? (
          <p className="text-sm text-white/50">No pinned posts yet.</p>
        ) : (
          <ul className="space-y-3">
            {pinned.map((p) => (
              <li key={p.id} className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-3">
                <p className="font-medium text-white/90">{p.title}</p>
                <p className="mt-1 text-sm text-white/70">{p.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <MessageSquare className="h-5 w-5 text-cyan-400" />
          Discussion
        </h2>
        {threads.length === 0 ? (
          <p className="text-sm text-white/50">No threads yet. Weekly universe posts will appear here.</p>
        ) : (
          <ul className="space-y-2">
            {threads.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-sm"
              >
                <span className="text-white/90">{t.title}</span>
                <span className="text-xs text-white/50">{t.updated}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
