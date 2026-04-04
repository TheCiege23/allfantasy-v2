'use client'

export type NflModalPayload = {
  kind: 'nfl'
  name: string
  position: string
  team?: string | null
  taxiEligible?: boolean
  bucketLabel?: string
  scoringLabel?: string
}

export type DevyModalPayload = {
  kind: 'devy'
  name: string
  position: string
  school?: string | null
  classYear?: string | null
  projectedDeclaration?: string | null
  draftEligible?: string | null
  rightsOwner?: string | null
  acquiredVia?: string | null
  acquiredAt?: string | null
  hasEnteredNfl?: boolean
  nflEntryYear?: number | null
}

export type DevyPlayerModalPayload = NflModalPayload | DevyModalPayload

export function DevyPlayerModal({
  open,
  onClose,
  payload,
}: {
  open: boolean
  onClose: () => void
  payload: DevyPlayerModalPayload | null
}) {
  if (!open || !payload) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm md:items-center md:p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/[0.08] bg-[#0a1228] p-5 shadow-2xl md:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-[16px] font-bold text-white">
            {payload.kind === 'devy' ? 'Devy prospect' : 'NFL player'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white/[0.06] px-2 py-1 text-[12px] text-white/60"
            data-testid="devy-player-modal-close"
          >
            Close
          </button>
        </div>

        {payload.kind === 'nfl' ? (
          <div className="mt-4 space-y-3 text-[13px] text-white/80">
            <p className="text-[18px] font-bold text-white">{payload.name}</p>
            <p className="text-white/55">
              {payload.position}
              {payload.team ? ` · ${payload.team}` : ''}
            </p>
            {payload.bucketLabel ? (
              <p>
                <span className="text-white/45">Bucket: </span>
                {payload.bucketLabel}
              </p>
            ) : null}
            {payload.scoringLabel ? (
              <p>
                <span className="text-white/45">Scoring: </span>
                {payload.scoringLabel}
              </p>
            ) : null}
            {payload.taxiEligible ? (
              <span className="inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-100">
                Taxi eligible
              </span>
            ) : null}
          </div>
        ) : (
          <div className="mt-4 space-y-4 text-[13px] text-white/80">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-violet-600/40 px-3 py-1 text-[11px] font-bold uppercase text-violet-100">
                Devy
              </span>
            </div>
            <p className="text-[18px] font-bold text-white">{payload.name}</p>
            <p className="text-white/55">
              {payload.position}
              {payload.school ? ` · ${payload.school}` : ''}
            </p>
            <section className="rounded-xl border border-white/[0.06] bg-black/25 p-3 text-[12px]">
              <p>Class: {payload.classYear ?? '—'}</p>
              <p>Projected declaration: {payload.projectedDeclaration ?? 'Undeclared'}</p>
              <p>NFL draft status: {payload.draftEligible ?? '—'}</p>
              <p>Rights: {payload.rightsOwner ?? 'Your team'}</p>
            </section>
            <section className="rounded-xl border border-white/[0.06] bg-black/25 p-3 text-[12px] text-white/60">
              <p className="font-semibold text-white/80">Rights panel</p>
              <p className="mt-1">Acquired: {payload.acquiredAt ?? '—'} via {payload.acquiredVia ?? '—'}</p>
            </section>
            {payload.hasEnteredNfl ? (
              <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-[12px]">
                <p className="font-semibold text-emerald-100">Entered NFL {payload.nflEntryYear ?? ''}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-white/[0.1] px-3 py-2 text-[11px] font-semibold text-white/80 min-h-[44px]"
                  >
                    Move to taxi
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-2 text-[11px] font-semibold text-cyan-100 min-h-[44px]"
                  >
                    Move to active
                  </button>
                </div>
              </section>
            ) : null}
            <div className="flex flex-wrap gap-2 border-t border-white/[0.06] pt-3">
              <span className="text-[11px] text-white/40">Trade rights · Drop · History (wiring soon)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
