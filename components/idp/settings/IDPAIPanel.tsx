'use client'

/**
 * Commissioner / manager IDP AI shortcuts — each POSTs /api/idp/ai (AfSub server-side).
 */

import { useState } from 'react'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

type Action =
  | 'rankings'
  | 'waiver_targets'
  | 'sleepers'
  | 'scarcity'
  | 'power_rankings'

export function IDPAIPanel({ leagueId, isCommissioner }: { leagueId: string; isCommissioner: boolean }) {
  const [week, setWeek] = useState(1)
  const [busy, setBusy] = useState<Action | null>(null)
  const [locked, setLocked] = useState(false)
  const [text, setText] = useState<string | null>(null)

  const run = async (action: Action) => {
    setBusy(action)
    setLocked(false)
    setText(null)
    try {
      const res = await fetch('/api/idp/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId, week, action }),
      })
      if (res.status === 402) {
        setLocked(true)
        return
      }
      const data = await res.json().catch(() => ({}))
      setText(JSON.stringify(data, null, 2))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <h3 className="text-sm font-semibold text-white">IDP AI tools</h3>
      <p className="mt-1 text-xs text-white/50">
        Uses Chimmy with your league context. Requires AF Commissioner Subscription.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="idp-ai-week" className="text-xs text-white/55">
            NFL week
          </Label>
          <input
            id="idp-ai-week"
            type="number"
            min={1}
            max={18}
            value={week}
            onChange={(e) => setWeek(Math.min(18, Math.max(1, Number(e.target.value) || 1)))}
            className="mt-1 w-20 rounded-md border border-white/15 bg-black/30 px-2 py-1.5 text-sm text-white"
          />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!!busy}
          onClick={() => void run('rankings')}
          data-testid="idp-ai-rankings"
        >
          {busy === 'rankings' ? '…' : 'Weekly rankings'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!!busy}
          onClick={() => void run('waiver_targets')}
          data-testid="idp-ai-waivers"
        >
          {busy === 'waiver_targets' ? '…' : 'Waiver scan'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!!busy}
          onClick={() => void run('sleepers')}
          data-testid="idp-ai-sleepers"
        >
          {busy === 'sleepers' ? '…' : 'Sleepers'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!!busy}
          onClick={() => void run('scarcity')}
          data-testid="idp-ai-scarcity"
        >
          {busy === 'scarcity' ? '…' : 'Scarcity'}
        </Button>
        {isCommissioner ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!!busy}
            onClick={() => void run('power_rankings')}
            data-testid="idp-ai-power-rankings"
          >
            {busy === 'power_rankings' ? '…' : 'Power rankings (post to chat manually)'}
          </Button>
        ) : null}
      </div>
      {locked ? (
        <p className="mt-3 flex items-center gap-1 text-xs text-amber-200/90">
          <Lock className="h-3.5 w-3.5" /> 🔒 This feature requires the AF Commissioner Subscription.
        </p>
      ) : null}
      {text ? (
        <pre className="mt-3 max-h-48 overflow-auto rounded-lg border border-white/8 bg-black/30 p-2 text-[11px] text-white/80">
          {text}
        </pre>
      ) : null}
    </div>
  )
}
