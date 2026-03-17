'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Mic, Video, FileText, Share2 } from 'lucide-react'
import { MediaGenerationPanel } from '@/components/media-generation'
import type { MediaType } from '@/lib/media-generation/types'

const TOOLS: { type: MediaType; label: string; icon: React.ElementType }[] = [
  { type: 'podcast', label: 'Fantasy Podcast Generator', icon: Mic },
  { type: 'video', label: 'Video Generator', icon: Video },
  { type: 'blog', label: 'Blog Generator', icon: FileText },
  { type: 'social', label: 'Social Clip Generator', icon: Share2 },
]

export default function MediaPage() {
  const [selected, setSelected] = useState<MediaType | null>(null)

  return (
    <div className="mode-surface min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link
          href="/ai"
          className="mb-6 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white/90"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to AI Hub
        </Link>
        <h1 className="text-2xl font-bold text-white mb-2">AI Media</h1>
        <p className="text-sm text-white/60 mb-6">
          Generate → Preview → Approve → Publish. Podcast & video (HeyGen), blog (OpenAI), social (Grok).
        </p>

        {!selected ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {TOOLS.map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelected(type)}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10">
                  <Icon className="h-5 w-5 text-cyan-300" />
                </div>
                <span className="font-medium text-white">{label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-sm text-white/60 hover:text-white/90"
            >
              ← Change tool
            </button>
            <MediaGenerationPanel
              type={selected}
              initialPayload={{ sport: 'NFL' }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
