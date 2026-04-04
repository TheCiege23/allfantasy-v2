'use client'

/**
 * Player detail + Chimmy IDP analysis (AfSub). POST /api/idp/ai action player_analysis.
 */

import { useState } from 'react'
import { Lock, Sparkles } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export type IDPPlayerModalProps = {
  leagueId: string
  week: number
  playerId: string
  playerName: string
  position?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function IDPPlayerModal({
  leagueId,
  week,
  playerId,
  playerName,
  position,
  open,
  onOpenChange,
}: IDPPlayerModalProps) {
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)

  const runAnalysis = async () => {
    setLoading(true)
    setLocked(false)
    try {
      const res = await fetch('/api/idp/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId,
          week,
          action: 'player_analysis',
          playerId,
        }),
      })
      if (res.status === 402) {
        setLocked(true)
        setAnalysis(null)
        return
      }
      const data = (await res.json().catch(() => ({}))) as { narrative?: string; error?: string }
      if (!res.ok) {
        setAnalysis(data.error ?? 'Request failed')
        return
      }
      setAnalysis(data.narrative ?? '')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto border border-white/10 bg-[#0a1228] text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="pr-8 text-base text-white">
            {playerName}
            {position ? (
              <span className="ml-2 text-sm font-normal text-white/50">({position})</span>
            ) : null}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Button
            type="button"
            size="sm"
            disabled={loading}
            onClick={() => void runAnalysis()}
            className="w-full gap-2 border border-cyan-500/30 bg-cyan-950/40 text-cyan-100 hover:bg-cyan-950/60"
            data-testid="idp-player-ai-analysis"
          >
            {locked ? <Lock className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Analyzing…' : locked ? 'AI Analysis — subscription required' : 'AI Analysis'}
          </Button>
          {locked ? (
            <p className="rounded-lg border border-amber-500/25 bg-amber-950/20 px-3 py-2 text-sm text-amber-100/90">
              🔒 This feature requires the AF Commissioner Subscription.
            </p>
          ) : null}
          {analysis ? (
            <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm leading-relaxed text-white/90 whitespace-pre-wrap">
              {analysis}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
