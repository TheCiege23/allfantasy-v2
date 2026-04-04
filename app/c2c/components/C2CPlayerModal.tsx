'use client'

import type { C2CPlayerRow } from './c2cPlayerTypes'

export function C2CPlayerModal({
  open,
  onClose,
  player,
  side,
  leagueId,
  hasAfSub = false,
  countsTowardScore,
}: {
  open: boolean
  onClose: () => void
  player: C2CPlayerRow | null
  side: 'campus' | 'canton'
  leagueId: string
  hasAfSub?: boolean
  countsTowardScore: boolean
}) {
  if (!open || !player) return null

  const campus = side === 'campus'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm md:items-center md:p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      data-testid="c2c-player-modal"
    >
      <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/[0.08] bg-[#0a1228] p-5 shadow-2xl md:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-[16px] font-bold text-white">{campus ? '🎓 Campus player' : '🏙 Canton player'}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white/[0.06] px-2 py-1 text-[12px] text-white/60"
            data-testid="c2c-player-modal-close"
          >
            Close
          </button>
        </div>

        <div className="mt-4 space-y-3 text-[13px] text-white/80">
          <p className="text-[18px] font-bold text-white">{player.playerName}</p>
          <p className="text-white/55">
            {player.position}
            {campus && player.school ? ` · ${player.school}` : ''}
            {!campus && player.nflNbaTeam ? ` · ${player.nflNbaTeam}` : ''}
          </p>

          {countsTowardScore ? (
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-100">
              Counts toward team score: YES
            </p>
          ) : (
            <p className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[12px] text-white/55">
              Display only — does not count
            </p>
          )}

          {campus ? (
            <>
              {player.classYear ? (
                <p>
                  <span className="text-white/45">Class: </span>
                  {player.classYear}
                </p>
              ) : null}
              {player.projectedDeclarationYear ? (
                <p>
                  <span className="text-white/45">Declaration: </span>
                  {player.projectedDeclarationYear}
                </p>
              ) : null}
              {player.hasEnteredPro && player.proEntryYear ? (
                <p>
                  <span className="text-white/45">Pro entry: </span>
                  {player.proEntryYear}
                </p>
              ) : null}
              <p className="text-[11px] text-white/40">
                Season stats and weekly breakdown wire to PlayerWeeklyScore when available.
              </p>
            </>
          ) : (
            <>
              <p>
                <span className="text-white/45">Rookie: </span>
                {player.isRookieEligible ? 'Yes' : 'No'}
              </p>
              <p>
                <span className="text-white/45">Taxi: </span>
                {player.isTaxiEligible ? `Eligible (${player.taxiYearsUsed ?? 0} yrs used)` : 'N/A'}
              </p>
            </>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-2 border-t border-white/[0.06] pt-4">
          {campus ? (
            <button
              type="button"
              disabled
              className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[12px] text-white/35"
              title="Available after player enters the league"
            >
              Move to Canton Bench (after pro entry)
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-200/80"
            >
              Move to Campus — not allowed
            </button>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled
              className="rounded-lg border border-white/[0.08] px-3 py-2 text-[12px] text-white/45"
            >
              Drop
            </button>
            <button
              type="button"
              disabled
              className="rounded-lg border border-white/[0.08] px-3 py-2 text-[12px] text-white/45"
            >
              Trade
            </button>
            {!campus ? (
              <>
                <button type="button" disabled className="rounded-lg border border-white/[0.08] px-3 py-2 text-[12px] text-white/45">
                  Taxi
                </button>
                <button type="button" disabled className="rounded-lg border border-white/[0.08] px-3 py-2 text-[12px] text-white/45">
                  IR
                </button>
              </>
            ) : null}
          </div>
          {hasAfSub ? (
            <a
              href={`/league/${leagueId}?view=team`}
              className="mt-2 inline-flex justify-center rounded-lg border border-cyan-500/35 bg-cyan-500/10 px-3 py-2 text-[12px] font-semibold text-cyan-200 hover:bg-cyan-500/15"
              data-testid="c2c-player-modal-ai"
            >
              AI Analysis (AfSub)
            </a>
          ) : (
            <p className="text-center text-[11px] text-white/35">AI analysis requires AfSub.</p>
          )}
        </div>
      </div>
    </div>
  )
}
