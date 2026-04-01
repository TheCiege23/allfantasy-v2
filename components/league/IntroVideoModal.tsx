'use client'

import { Button } from '@/components/ui/button'
import type { LeagueIntroVideoData } from '@/components/league/types'

export default function IntroVideoModal({
  data,
  open,
  onClose,
}: {
  data: LeagueIntroVideoData
  open: boolean
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#081124] p-5 shadow-2xl">
        <div className="mb-4">
          <div className="text-lg font-semibold text-white">{data.title}</div>
          <div className="mt-1 text-sm text-white/65">{data.subtitle}</div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#030816]">
          {data.introVideo ? (
            <video
              className="aspect-video w-full"
              controls
              autoPlay
              muted
              poster={data.thumbnail}
            >
              <source src={data.introVideo} />
            </video>
          ) : (
            <div className="flex aspect-video items-center justify-center px-6 text-center text-sm text-white/60">
              {data.fallbackCopy}
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={onClose}>Continue</Button>
        </div>
      </div>
    </div>
  )
}
