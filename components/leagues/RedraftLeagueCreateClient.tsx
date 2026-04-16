'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { LeagueSport } from '@prisma/client'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { readFetchJson } from '@/lib/http/readFetchJson'
import { DRAFT_TYPES_REDRAFT } from '@/lib/redraft-creation/constants'
import type { RedraftDraftTypeId } from '@/lib/redraft-creation/constants'
import { getRedraftTeamCountOptions } from '@/lib/redraft-creation/team-limits'
import type { SoccerPipeline } from '@/lib/redraft-creation/sport-config'
import { validateRedraftCreatePayload } from '@/lib/redraft-creation/validate'
import { ArrowLeft } from 'lucide-react'

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern' },
  { value: 'America/Chicago', label: 'Central' },
  { value: 'America/Denver', label: 'Mountain' },
  { value: 'America/Los_Angeles', label: 'Pacific' },
  { value: 'America/Phoenix', label: 'Arizona' },
  { value: 'America/Anchorage', label: 'Alaska' },
  { value: 'Pacific/Honolulu', label: 'Hawaii' },
  { value: 'America/Toronto', label: 'Toronto' },
  { value: 'America/Vancouver', label: 'Vancouver' },
  { value: 'Europe/London', label: 'London' },
] as const

const DRAFT_LABELS: Record<RedraftDraftTypeId, string> = {
  snake: 'Snake',
  linear: 'Linear',
  auction: 'Auction',
  offline: 'Offline',
  auto: 'Auto',
}

const SPORT_MEDIA: Record<LeagueSport, { label: string; image: string; video: string; fallback: string }> = {
  NFL: { label: 'NFL Football', image: '/Football.png', video: '/Football.mp4', fallback: '/af-crest.png' },
  NBA: { label: 'NBA Basketball', image: '/Basketball.png', video: '/Basketball.mp4', fallback: '/af-crest.png' },
  MLB: { label: 'MLB Baseball', image: '/Baseball.png', video: '/Baseball.mp4', fallback: '/af-crest.png' },
  NHL: { label: 'NHL Hockey', image: '/Hockey.png', video: '/Hockey.mp4', fallback: '/af-crest.png' },
  NCAAF: { label: 'NCAA Football', image: '/Football.png', video: '/Football.mp4', fallback: '/af-crest.png' },
  NCAAB: { label: 'NCAA Basketball', image: '/Basketball.png', video: '/Basketball.mp4', fallback: '/af-crest.png' },
  SOCCER: { label: 'Soccer', image: '/Soccer.png', video: '/Soccer.mp4', fallback: '/af-crest.png' },
}

const TRADE_OPTIONS = [
  { value: 'commissioner', label: 'Commissioner review required' },
  { value: 'league_vote', label: 'League vote / veto' },
  { value: 'instant', label: 'No review / instant processing' },
] as const

type TradeMode = (typeof TRADE_OPTIONS)[number]['value']

type WizardPage = 1 | 2 | 3 | 4

type FormState = {
  sport: LeagueSport | null
  soccerPipeline: SoccerPipeline | null
  draftType: RedraftDraftTypeId | null
  name: string
  timezone: string
  language: 'en' | 'es'
  tradeReviewMode: TradeMode
  teamCount: number
}

function defaultTeamCount(sport: LeagueSport, soccer: SoccerPipeline | null): number {
  const opts = getRedraftTeamCountOptions(sport, soccer)
  const pref = 12
  return opts.includes(pref) ? pref : opts[Math.floor(opts.length / 2)] ?? 12
}

export type RedraftLeagueCreateClientProps = {
  /** Post-login return path when session is missing mid-flow (401 from API). */
  loginCallbackPath?: string
  /** Hide outer title when embedded in a page that already has a header. */
  hideOuterTitle?: boolean
}

export function RedraftLeagueCreateClient({
  loginCallbackPath = '/create-league',
  hideOuterTitle = false,
}: RedraftLeagueCreateClientProps) {
  const router = useRouter()
  const [page, setPage] = useState<WizardPage>(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submitLock = useRef(false)

  const [state, setState] = useState<FormState>(() => ({
    sport: null,
    soccerPipeline: null,
    draftType: null,
    name: '',
    timezone: 'America/New_York',
    language: 'en',
    tradeReviewMode: 'commissioner',
    teamCount: 12,
  }))

  const teamOptions = useMemo(() => {
    if (!state.sport) return []
    return getRedraftTeamCountOptions(state.sport, state.soccerPipeline)
  }, [state.sport, state.soccerPipeline])

  const canAdvanceP1 = useMemo(() => {
    if (!state.sport || !state.draftType) return false
    if (state.sport === 'SOCCER' && !state.soccerPipeline) return false
    return true
  }, [state.sport, state.soccerPipeline, state.draftType])

  const canAdvanceP2 = state.name.trim().length > 0

  const canAdvanceP3 = useMemo(() => {
    if (!state.sport || teamOptions.length === 0) return false
    return teamOptions.includes(state.teamCount)
  }, [state.sport, state.teamCount, teamOptions])

  const setSport = useCallback((sport: LeagueSport) => {
    setState((s) => {
      const soccerPipeline = sport === 'SOCCER' ? s.soccerPipeline ?? 'mls' : null
      const teamCount = defaultTeamCount(sport, soccerPipeline)
      const nextOpts = getRedraftTeamCountOptions(sport, soccerPipeline)
      const tc = nextOpts.includes(teamCount) ? teamCount : nextOpts[0] ?? 12
      return {
        ...s,
        sport,
        soccerPipeline,
        teamCount: tc,
      }
    })
  }, [])

  const goNext = useCallback(() => {
    setError(null)
    if (page === 1 && !canAdvanceP1) {
      setError('Select sport, draft type' + (state.sport === 'SOCCER' ? ', and soccer region (MLS or European).' : '.'))
      return
    }
    if (page === 2 && !canAdvanceP2) {
      setError('League name is required.')
      return
    }
    if (page === 3 && !canAdvanceP3) {
      setError('Team count is not valid for this sport. Choose a value from the list.')
      return
    }
    setPage((p) => (p < 4 ? ((p + 1) as WizardPage) : p))
  }, [page, canAdvanceP1, canAdvanceP2, canAdvanceP3, state.sport])

  const goBack = useCallback(() => {
    setError(null)
    if (page > 1) setPage((p) => (p > 1 ? ((p - 1) as WizardPage) : p))
    else router.push('/dashboard')
  }, [page, router])

  async function submit() {
    if (submitLock.current || submitting) return
    submitLock.current = true
    setSubmitting(true)
    setError(null)

    if (!state.sport || !state.draftType) {
      setError('Complete setup: sport and draft type are required.')
      setSubmitting(false)
      submitLock.current = false
      return
    }
    if (state.sport === 'SOCCER' && !state.soccerPipeline) {
      setError('Choose MLS or European pipeline for Soccer.')
      setSubmitting(false)
      submitLock.current = false
      return
    }
    if (!canAdvanceP2) {
      setError('League name is required.')
      setSubmitting(false)
      submitLock.current = false
      return
    }
    if (!canAdvanceP3) {
      setError('Team count exceeds limit or is invalid for this sport.')
      setSubmitting(false)
      submitLock.current = false
      return
    }

    const payload = {
      leagueType: 'redraft' as const,
      sport: state.sport,
      soccerPipeline: state.sport === 'SOCCER' ? state.soccerPipeline : undefined,
      draftType: state.draftType,
      name: state.name.trim(),
      timezone: state.timezone,
      language: state.language,
      tradeReviewMode: state.tradeReviewMode,
      teamCount: state.teamCount,
    }

    const pre = validateRedraftCreatePayload(payload)
    if (!pre.ok) {
      const lines = [pre.error, ...pre.issues.map((i) => `${i.path}: ${i.message}`)]
      setError(lines.filter(Boolean).join('\n'))
      setSubmitting(false)
      submitLock.current = false
      return
    }

    const callback = encodeURIComponent(loginCallbackPath)

    try {
      const res = await fetch('/api/leagues/redraft/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'same-origin',
      })
      type Ok = {
        success?: boolean
        leagueId?: string
        homepageUrl?: string
        error?: string
        detail?: string
        issues?: { path: string; message: string }[]
      }
      const { ok, data, errorMessage } = await readFetchJson<Ok>(res)
      if (res.status === 401) {
        router.push(`/login?callbackUrl=${callback}`)
        return
      }
      if (!ok || !data?.success) {
        const lines: string[] = []
        if (data?.error) lines.push(data.error)
        if (data?.detail) lines.push(data.detail)
        if (data?.issues?.length) {
          for (const i of data.issues) {
            lines.push(`${i.path}: ${i.message}`)
          }
        }
        setError(lines.join('\n') || errorMessage || 'Request failed')
        return
      }
      if (!data.homepageUrl || !data.leagueId) {
        setError('League created but response was missing homepageUrl or leagueId.')
        return
      }
      router.push(data.homepageUrl)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
      submitLock.current = false
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 space-y-6">
      {!hideOuterTitle && (
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create league</h1>
          <p className="text-sm text-white/55 mt-1">Redraft · {page} / 4</p>
        </div>
      )}

      {error && page !== 4 && (
        <div
          className="rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-100 whitespace-pre-wrap break-words"
          role="alert"
        >
          {error}
        </div>
      )}

      {page === 1 && (
        <Card className="border-white/10 bg-[#040915]/90">
          <CardHeader>
            <CardTitle className="text-white text-lg">Setup</CardTitle>
            <CardDescription className="text-white/50">
              Choose sport, then draft type. League type is redraft only in this flow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-white/85">League type</Label>
              <div className="rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-sm font-semibold text-cyan-100">
                Redraft
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/85">Sport</Label>
              <Select
                value={state.sport ?? undefined}
                onValueChange={(v) => setSport(v as LeagueSport)}
              >
                <SelectTrigger className="border-white/15 bg-[#050f1f]/90 text-white">
                  <SelectValue placeholder="Select sport" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_SPORTS.map((sp) => (
                    <SelectItem key={sp} value={sp}>
                      {sp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {state.sport === 'SOCCER' && (
              <div className="space-y-1.5">
                <Label className="text-white/85">Soccer data region</Label>
                <Select
                  value={state.soccerPipeline ?? 'mls'}
                  onValueChange={(v) =>
                    setState((s) => ({
                      ...s,
                      soccerPipeline: v as SoccerPipeline,
                      teamCount: defaultTeamCount('SOCCER', v as SoccerPipeline),
                    }))
                  }
                >
                  <SelectTrigger className="border-white/15 bg-[#050f1f]/90 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mls">MLS</SelectItem>
                    <SelectItem value="euro">European</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-white/85">Draft type</Label>
              <Select
                value={state.draftType ?? undefined}
                onValueChange={(v) => setState((s) => ({ ...s, draftType: v as RedraftDraftTypeId }))}
              >
                <SelectTrigger className="border-white/15 bg-[#050f1f]/90 text-white">
                  <SelectValue placeholder="Select draft type" />
                </SelectTrigger>
                <SelectContent>
                  {DRAFT_TYPES_REDRAFT.map((d) => (
                    <SelectItem key={d} value={d}>
                      {DRAFT_LABELS[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {state.sport && (
              <div className="rounded-xl border border-cyan-400/20 bg-[#07122d]/70 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-cyan-200/80">Selected sport preview</p>
                <p className="mt-1 text-sm text-white/85">{SPORT_MEDIA[state.sport].label}</p>
                <video
                  key={SPORT_MEDIA[state.sport].video}
                  className="mt-3 h-44 w-full rounded-xl border border-white/15 bg-black object-cover"
                  src={SPORT_MEDIA[state.sport].video}
                  poster={SPORT_MEDIA[state.sport].image}
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls
                  onError={(event) => {
                    const target = event.currentTarget
                    target.poster = SPORT_MEDIA[state.sport!].fallback
                    target.removeAttribute('src')
                    target.load()
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {page === 2 && (
        <Card className="border-white/10 bg-[#040915]/90">
          <CardHeader>
            <CardTitle className="text-white text-lg">League details</CardTitle>
            <CardDescription className="text-white/50">Name, region, and trade review.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-white/85">League name</Label>
              <Input
                value={state.name}
                onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
                className="border-white/15 bg-[#050f1f]/90 text-white"
                placeholder="AllFantasy Premier League"
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/85">League timezone</Label>
              <Select value={state.timezone} onValueChange={(v) => setState((s) => ({ ...s, timezone: v }))}>
                <SelectTrigger className="border-white/15 bg-[#050f1f]/90 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/85">Language</Label>
              <Select
                value={state.language}
                onValueChange={(v) => setState((s) => ({ ...s, language: v as 'en' | 'es' }))}
              >
                <SelectTrigger className="border-white/15 bg-[#050f1f]/90 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/85">Commissioner trade review</Label>
              <Select
                value={state.tradeReviewMode}
                onValueChange={(v) => setState((s) => ({ ...s, tradeReviewMode: v as TradeMode }))}
              >
                <SelectTrigger className="border-white/15 bg-[#050f1f]/90 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRADE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {page === 3 && (
        <Card className="border-white/10 bg-[#040915]/90">
          <CardHeader>
            <CardTitle className="text-white text-lg">Team count</CardTitle>
            <CardDescription className="text-white/50">Managers and roster slots for this season.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-white/85">Number of teams</Label>
              <Select
                value={String(state.teamCount)}
                onValueChange={(v) => setState((s) => ({ ...s, teamCount: Number(v) }))}
              >
                <SelectTrigger className="border-white/15 bg-[#050f1f]/90 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {teamOptions.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} teams
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {page === 4 && (
        <Card className="border-white/10 bg-[#040915]/90">
          <CardHeader>
            <CardTitle className="text-white text-lg">Review</CardTitle>
            <CardDescription className="text-white/50">
              Confirm and create your league. Use Back to edit any step.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-white/80">
            {error && (
              <div
                className="rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-100 whitespace-pre-wrap break-words"
                role="alert"
              >
                {error}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="text-xs font-medium text-cyan-300/90 underline-offset-2 hover:underline"
                onClick={() => {
                  setError(null)
                  setPage(1)
                }}
              >
                Edit setup
              </button>
              <button
                type="button"
                className="text-xs font-medium text-cyan-300/90 underline-offset-2 hover:underline"
                onClick={() => {
                  setError(null)
                  setPage(2)
                }}
              >
                Edit details
              </button>
              <button
                type="button"
                className="text-xs font-medium text-cyan-300/90 underline-offset-2 hover:underline"
                onClick={() => {
                  setError(null)
                  setPage(3)
                }}
              >
                Edit team count
              </button>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 space-y-1">
              <p>
                <span className="text-white/50">Type · </span>Redraft
              </p>
              <p>
                <span className="text-white/50">Sport · </span>
                {state.sport ?? '—'}
                {state.sport === 'SOCCER' && state.soccerPipeline
                  ? ` (${state.soccerPipeline === 'mls' ? 'MLS' : 'European'})`
                  : ''}
              </p>
              <p>
                <span className="text-white/50">Draft · </span>
                {state.draftType ? DRAFT_LABELS[state.draftType] : '—'}
              </p>
              <p>
                <span className="text-white/50">Name · </span>
                {state.name.trim() || '—'}
              </p>
              <p>
                <span className="text-white/50">Timezone · </span>
                {state.timezone}
              </p>
              <p>
                <span className="text-white/50">Language · </span>
                {state.language === 'en' ? 'English' : 'Español'}
              </p>
              <p>
                <span className="text-white/50">Trade review · </span>
                {TRADE_OPTIONS.find((t) => t.value === state.tradeReviewMode)?.label}
              </p>
              <p>
                <span className="text-white/50">Teams · </span>
                {state.teamCount}
              </p>
            </div>
            <Button
              type="button"
              className="w-full min-h-[48px] bg-cyan-400 text-black font-bold hover:bg-cyan-300"
              disabled={submitting || !canAdvanceP2}
              onClick={submit}
            >
              {submitting ? 'Creating…' : 'Create league'}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white hover:bg-black/55"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        {page < 4 && (
          <Button
            type="button"
            className="flex-1 min-h-[48px] bg-cyan-400 text-black font-bold hover:bg-cyan-300"
            onClick={goNext}
            disabled={(page === 1 && !canAdvanceP1) || (page === 3 && !canAdvanceP3)}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  )
}
