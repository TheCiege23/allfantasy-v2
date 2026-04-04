'use client'

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { isWeatherSensitiveSport } from '@/lib/weather/outdoorSportMetadata'
import type { AFCrestButtonProps } from '@/components/weather/afCrestTypes'
import type { AFProjection } from '@/lib/weather/afProjectionService'
import { useAFProjection } from '@/components/weather/useAFProjection'

function sizePx(size: AFCrestButtonProps['size']): number {
  if (size === 'xs') return 14
  if (size === 'md') return 18
  return 16
}

function PanelContent({ data, baseline }: { data: AFProjection; baseline: number }) {
  const adj = data.weatherAdjustment
  const indoor = !data.isOutdoorGame
  const noImpact =
    Math.abs(adj) < 0.05 && !data.hasWeatherData && (data.adjustmentFactors?.length ?? 0) === 0

  const w = data.weatherSnapshot
  const temp = w?.temperatureF != null ? Math.round(w.temperatureF) : null
  const wind = w?.windSpeedMph != null ? Math.round(w.windSpeedMph) : null

  return (
    <div className="space-y-2 text-[11px] leading-snug text-white/80">
      {indoor ? (
        <p className="text-white/70">Indoor venue — no weather adjustment</p>
      ) : noImpact ? (
        <p className="text-white/65">No meaningful weather impact for this game.</p>
      ) : null}
      <div>
        <span className="text-white/45">AF Projected: </span>
        <span className="font-semibold text-cyan-200">{data.afProjection.toFixed(1)} pts</span>
      </div>
      <div>
        <span className="text-white/45">Adjustment: </span>
        <span className={adj >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
          {adj >= 0 ? '+' : ''}
          {adj.toFixed(1)} pts
        </span>
      </div>
      <p>
        <span className="text-white/45">Reason: </span>
        {data.shortReason || '—'}
      </p>
      {w?.conditionLabel != null || temp != null ? (
        <p>
          <span className="text-white/45">Weather: </span>
          {w?.conditionLabel ?? '—'}
          {temp != null ? `, ${temp}°F` : ''}
          {wind != null ? `, ${wind}mph wind` : ''}
        </p>
      ) : null}
      <p>
        <span className="text-white/45">Confidence: </span>
        {data.confidenceLevel}
      </p>
      <p className="text-[10px] text-white/35">Baseline: {baseline.toFixed(1)} pts</p>
    </div>
  )
}

export function AFCrestButton(props: AFCrestButtonProps) {
  const {
    playerId,
    playerName,
    sport,
    position,
    baselineProjection,
    lat,
    lng,
    gameTime,
    isIndoor,
    isDome,
    roofClosed,
    week,
    season,
    eventId,
    size = 'sm',
    className = '',
  } = props

  const id = useId()
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [popPos, setPopPos] = useState<{ top: number; left: number }>({ top: 80, left: 16 })

  const { loading, data, error, fetch } = useAFProjection(props)

  useEffect(() => {
    setMounted(true)
    const mq = window.matchMedia('(max-width: 767px)')
    const fn = () => setMobile(mq.matches)
    fn()
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])

  useLayoutEffect(() => {
    if (!open || mobile || !btnRef.current) return
    const el = btnRef.current
    const r = el.getBoundingClientRect()
    const left = Math.min(window.innerWidth - 256, Math.max(8, r.left + r.width / 2 - 120))
    const top = Math.min(window.innerHeight - 120, r.bottom + 8)
    setPopPos({ top, left })
  }, [open, mobile, data, loading])

  const sportKey = sport.trim().toUpperCase()
  if (!isWeatherSensitiveSport(sportKey)) return null
  if (isIndoor || isDome) return null

  const px = sizePx(size)

  const onToggle = useCallback(async () => {
    if (!open && !data && !loading) {
      await fetch()
    }
    setOpen((o) => !o)
  }, [open, data, loading, fetch])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (btnRef.current?.contains(t)) return
      if (popRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const adj = data?.weatherAdjustment ?? null
  const badgeColor =
    adj == null ? 'bg-white/10 text-white/50' : adj > 0 ? 'bg-emerald-500/25 text-emerald-200' : adj < 0 ? 'bg-rose-500/25 text-rose-200' : 'bg-white/10 text-white/45'

  const inlineAdj =
    size === 'sm' && data && adj != null ? (
      <span className={`text-[10px] font-semibold ${adj > 0 ? 'text-emerald-300' : adj < 0 ? 'text-rose-300' : 'text-white/45'}`}>
        {adj > 0 ? '+' : ''}
        {adj.toFixed(1)}
      </span>
    ) : null

  const popover = open && mounted && (
    <>
      {mobile ? (
        <div
          className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
          aria-hidden
          onClick={() => setOpen(false)}
        />
      ) : null}
      <div
        ref={popRef}
        id={`af-crest-pop-${id}`}
        role="dialog"
        aria-label="AF weather-adjusted projection"
        className={
          mobile
            ? 'fixed inset-x-0 bottom-0 z-[201] max-h-[70vh] overflow-y-auto rounded-t-2xl border border-white/[0.1] bg-[#0a1228] p-4 shadow-2xl'
            : 'fixed z-[200] w-[240px] rounded-xl border border-white/[0.1] bg-[#0a1228] p-3 shadow-2xl'
        }
        style={mobile ? undefined : { top: popPos.top, left: popPos.left }}
      >
        {!mobile ? (
          <div
            className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-white/[0.1] bg-[#0a1228]"
            aria-hidden
          />
        ) : null}
        <div className={mobile ? '' : 'relative'}>
          {loading ? (
            <div className="flex items-center gap-2 text-[12px] text-white/60">
              <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
              Loading AF projection…
            </div>
          ) : error ? (
            <p className="text-[12px] text-amber-200/90">{error}</p>
          ) : data ? (
            <PanelContent data={data} baseline={baselineProjection} />
          ) : (
            <p className="text-[12px] text-white/45">No data</p>
          )}
        </div>
      </div>
    </>
  )

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <button
        ref={btnRef}
        type="button"
        aria-expanded={open}
        aria-controls={`af-crest-pop-${id}`}
        onClick={() => void onToggle()}
        className={`relative inline-flex shrink-0 items-center justify-center rounded-md border border-white/[0.08] bg-gradient-to-br from-cyan-500/20 via-slate-900/60 to-violet-600/20 font-bold text-[9px] text-cyan-100 shadow-sm transition hover:opacity-100 hover:shadow-[0_0_12px_rgba(34,211,238,0.25)] focus:outline-none focus:ring-2 focus:ring-cyan-500/40 ${
          data ? 'opacity-100' : 'opacity-60'
        }`}
        style={{ width: px + 10, height: px + 6, fontSize: Math.max(8, px - 6) }}
        data-testid="af-crest-button"
        title="AF weather-adjusted projection"
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin text-cyan-200" style={{ width: px - 4, height: px - 4 }} /> : 'AF'}
        {data && adj != null && size !== 'xs' ? (
          <span
            className={`absolute -right-1 -top-1 min-w-[1.1rem] rounded px-0.5 text-[8px] font-bold ${badgeColor}`}
          >
            {adj > 0 ? '+' : ''}
            {adj.toFixed(1)}
          </span>
        ) : null}
      </button>
      {inlineAdj}
      {mounted && open && createPortal(popover, document.body)}
    </span>
  )
}
