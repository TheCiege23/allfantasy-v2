'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'
import type { SupplementalAsset, SupplementalScenario } from '@/lib/supplemental-draft/types'

type PreviewResponse = {
  assets: SupplementalAsset[]
  playerCount: number
  draftPickCount: number
  totalFaab: number
  totalAssets: number
  suggestedRounds: number
  suggestedPicksPerRound: number
}

type RosterRow = { rosterId: string; teamName: string; isOrphan: boolean }

function SortableParticipant({
  id,
  label,
}: {
  id: string
  label: string
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/90"
    >
      <button
        type="button"
        className="cursor-grab touch-none text-white/35"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        ⋮⋮
      </button>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </div>
  )
}

export default function SupplementalDraftSetupPage() {
  const params = useParams<{ leagueId: string }>()
  const router = useRouter()
  const leagueId = params.leagueId

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1)
  const [scenario, setScenario] = useState<SupplementalScenario>('orphan_teams')
  const [orphanPayload, setOrphanPayload] = useState<{
    orphanedTeams: { rosterId: string; teamName: string }[]
    orphanCount: number
  } | null>(null)
  const [sourceIds, setSourceIds] = useState<Set<string>>(new Set())
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const [orderMode, setOrderMode] = useState<'randomized' | 'commissioner_set'>('randomized')
  const [participantOrder, setParticipantOrder] = useState<string[]>([])
  const [participantLabels, setParticipantLabels] = useState<Record<string, string>>({})
  const [pickTimeSeconds, setPickTimeSeconds] = useState(120)
  const [autoPickOnTimeout, setAutoPickOnTimeout] = useState(true)

  const [launching, setLaunching] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const loadOrphans = useCallback(async () => {
    const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/orphaned-teams`, { cache: 'no-store' })
    const json = (await res.json().catch(() => ({}))) as {
      orphanedTeams?: { rosterId: string; teamName: string }[]
      orphanCount?: number
      error?: string
    }
    if (!res.ok) throw new Error(json.error ?? 'Failed to load orphans')
    setOrphanPayload({
      orphanedTeams: json.orphanedTeams ?? [],
      orphanCount: json.orphanCount ?? 0,
    })
    const all = new Set((json.orphanedTeams ?? []).map((t) => t.rosterId))
    setSourceIds(all)
  }, [leagueId])

  const loadParticipants = useCallback(async () => {
    const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/downsize`, { cache: 'no-store' })
    const json = (await res.json().catch(() => ({}))) as {
      rosters?: RosterRow[]
      error?: string
    }
    if (!res.ok) throw new Error(json.error ?? 'Failed to load rosters')
    const rows = (json.rosters ?? []).filter((r) => !r.isOrphan)
    const ids = rows.map((r) => r.rosterId)
    const labels = Object.fromEntries(rows.map((r) => [r.rosterId, r.teamName]))
    setParticipantOrder(ids)
    setParticipantLabels(labels)
  }, [leagueId])

  useEffect(() => {
    void loadOrphans().catch((e) => toast.error(e instanceof Error ? e.message : 'Load failed'))
  }, [loadOrphans])

  useEffect(() => {
    void loadParticipants().catch(() => {
      /* optional for non–dynasty leagues */
    })
  }, [loadParticipants])

  useEffect(() => {
    if (step === 4) {
      void loadParticipants().catch(() => {})
    }
  }, [step, loadParticipants])

  const toggleSource = (id: string) => {
    setSourceIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const runPreview = async (): Promise<boolean> => {
    const sourceRosterIds = [...sourceIds]
    if (sourceRosterIds.length < 2) {
      toast.error('Select at least two source teams.')
      return false
    }
    setPreviewLoading(true)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/supplemental-draft/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceRosterIds }),
      })
      const json = (await res.json().catch(() => ({}))) as PreviewResponse & { error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Preview failed')
      setPreview(json)
      toast.success('Asset pool calculated.')
      return true
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Preview failed')
      return false
    } finally {
      setPreviewLoading(false)
    }
  }

  const canContinueFrom2 = sourceIds.size >= 2
  const canContinueFrom3 = preview != null
  const canContinueFrom4 = orderMode === 'randomized' || participantOrder.length > 0

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setParticipantOrder((items) => {
      const oldIndex = items.indexOf(String(active.id))
      const newIndex = items.indexOf(String(over.id))
      if (oldIndex < 0 || newIndex < 0) return items
      return arrayMove(items, oldIndex, newIndex)
    })
  }

  const launch = async () => {
    const sourceRosterIds = [...sourceIds]
    const body = {
      scenario,
      sourceRosterIds,
      participantRosterIds:
        orderMode === 'commissioner_set' && participantOrder.length > 0 ? participantOrder : undefined,
      orderMode,
      manualOrder: orderMode === 'commissioner_set' ? participantOrder : undefined,
      pickTimeSeconds,
      autoPickOnTimeout,
    }
    setLaunching(true)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/supplemental-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = (await res.json().catch(() => ({}))) as { draft?: { id: string }; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Could not create draft')
      const draftId = json.draft?.id
      if (!draftId) throw new Error('Missing draft id')

      const startRes = await fetch(
        `/api/leagues/${encodeURIComponent(leagueId)}/supplemental-draft/${encodeURIComponent(draftId)}/start`,
        { method: 'POST' }
      )
      if (!startRes.ok) {
        const err = (await startRes.json().catch(() => ({}))) as { error?: string }
        throw new Error(err.error ?? 'Draft created but could not start.')
      }
      router.push(`/league/${leagueId}/supplemental-draft/${draftId}`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Launch failed')
    } finally {
      setLaunching(false)
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-white">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Supplemental draft setup</h1>
          <p className="text-xs text-white/50">Step {step} of 5</p>
        </div>
        <Link href={`/league/${leagueId}`} className="text-xs text-cyan-300/90 hover:underline">
          Back to league
        </Link>
      </div>

      <div className="mb-6 flex gap-1 text-[10px] text-white/40">
        {[1, 2, 3, 4, 5].map((s) => (
          <span
            key={s}
            className={`rounded-full px-2 py-0.5 ${step === s ? 'bg-cyan-500/20 text-cyan-200' : 'bg-white/5'}`}
          >
            {s}
          </span>
        ))}
      </div>

      {step === 1 ? (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-[#0a1328] p-4">
          <h2 className="text-sm font-semibold">Scenario</h2>
          <label className="flex cursor-pointer gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
            <input
              type="radio"
              name="scen"
              checked={scenario === 'orphan_teams'}
              onChange={() => setScenario('orphan_teams')}
            />
            <div>
              <p className="text-sm font-medium">Orphaned teams</p>
              <p className="text-xs text-white/50">Distribute players, picks, and FAAB from vacant manager slots.</p>
            </div>
          </label>
          <label className="flex cursor-pointer gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
            <input
              type="radio"
              name="scen"
              checked={scenario === 'league_downsizing'}
              onChange={() => setScenario('league_downsizing')}
            />
            <div>
              <p className="text-sm font-medium">League downsizing</p>
              <p className="text-xs text-white/50">
                Shrink the league first, then run a supplemental draft from dissolved rosters. Use the downsizing tool
                if you still need to merge teams.
              </p>
            </div>
          </label>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-[#0a1328] p-4">
          <h2 className="text-sm font-semibold">Source teams</h2>
          {scenario === 'league_downsizing' ? (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-100/90">
              <p className="mb-2">Reduce league size and merge or pool dissolved rosters first if needed.</p>
              <Link
                href={`/league/${leagueId}/downsize`}
                className="inline-flex rounded-lg border border-amber-400/40 px-3 py-1.5 font-semibold text-amber-50 hover:bg-amber-500/20"
              >
                Open downsizing tool
              </Link>
              <button
                type="button"
                onClick={() => void loadOrphans()}
                className="ml-2 mt-2 rounded-lg border border-white/15 px-3 py-1.5 text-[11px] text-white/80 hover:bg-white/5 sm:mt-0"
              >
                Refresh orphan list
              </button>
            </div>
          ) : null}
          {orphanPayload == null ? (
            <p className="text-sm text-white/45">Loading…</p>
          ) : (
            <div className="space-y-2">
              {orphanPayload.orphanedTeams.map((t) => (
                <label key={t.rosterId} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    className="rounded border-white/20"
                    checked={sourceIds.has(t.rosterId)}
                    onChange={() => toggleSource(t.rosterId)}
                  />
                  <span>{t.teamName}</span>
                </label>
              ))}
              {orphanPayload.orphanedTeams.length === 0 ? (
                <p className="text-xs text-white/45">No orphaned rosters. Check downsizing or open slots.</p>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {step === 3 && preview ? (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-[#0a1328] p-4">
          <h2 className="text-sm font-semibold">Asset pool</h2>
          <p className="text-xs text-white/55">
            Players ({preview.playerCount}) · Picks ({preview.draftPickCount}) · FAAB ${preview.totalFaab}
          </p>
          <p className="text-[11px] text-amber-200/80">⚠️ FAAB is forfeited if unclaimed after the draft.</p>
          <p className="text-xs text-white/70">
            Suggested structure: {preview.suggestedRounds} rounds × {preview.suggestedPicksPerRound} picks/round
          </p>
          <div className="grid max-h-64 gap-2 overflow-y-auto rounded-lg border border-white/10 p-2 text-[11px]">
            {preview.assets.map((a) => (
              <div key={a.id} className="flex justify-between gap-2 border-b border-white/5 py-1 text-white/80">
                <span>
                  {a.assetType === 'player'
                    ? `${a.playerName ?? 'Player'} · ${a.playerPosition ?? ''} ${a.playerTeam ?? ''}`
                    : a.assetType === 'draft_pick'
                      ? `${a.pickYear ?? ''} R${a.pickRound ?? ''}${a.isTradedPick ? ' · TRADED' : ''}`
                      : `FAAB $${a.faabAmount ?? 0}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-[#0a1328] p-4">
          <h2 className="text-sm font-semibold">Draft settings</h2>
          <div>
            <p className="mb-2 text-xs text-white/50">Draft order</p>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="radio"
                name="om"
                checked={orderMode === 'randomized'}
                onChange={() => setOrderMode('randomized')}
              />
              Randomize
            </label>
            <label className="mt-1 flex items-center gap-2 text-xs">
              <input
                type="radio"
                name="om"
                checked={orderMode === 'commissioner_set'}
                onChange={() => setOrderMode('commissioner_set')}
              />
              Set manually (drag)
            </label>
          </div>
          {orderMode === 'commissioner_set' && participantOrder.length > 0 ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={participantOrder} strategy={verticalListSortingStrategy}>
                <div className="space-y-1">
                  {participantOrder.map((id) => (
                    <SortableParticipant key={id} id={id} label={participantLabels[id] ?? id.slice(0, 8)} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : null}

          <div>
            <p className="mb-2 text-xs text-white/50">Pick timer</p>
            <div className="flex flex-wrap gap-2">
              {[60, 90, 120, 180, 0].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setPickTimeSeconds(sec)}
                  className={`rounded-lg border px-2 py-1 text-[11px] ${
                    pickTimeSeconds === sec ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-100' : 'border-white/15'
                  }`}
                >
                  {sec === 0 ? 'No limit' : `${sec}s`}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs text-white/50">Auto-pick on timeout</p>
            <button
              type="button"
              onClick={() => setAutoPickOnTimeout((v) => !v)}
              className={`rounded-lg border px-3 py-1.5 text-xs ${
                autoPickOnTimeout ? 'border-cyan-400/40 bg-cyan-500/15' : 'border-white/15'
              }`}
            >
              {autoPickOnTimeout ? 'On' : 'Off'}
            </button>
          </div>
        </div>
      ) : null}

      {step === 5 && preview ? (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-[#0a1328] p-4">
          <h2 className="text-sm font-semibold">Review</h2>
          <ul className="space-y-1 text-xs text-white/70">
            <li>Scenario: {scenario}</li>
            <li>Sources: {sourceIds.size} rosters</li>
            <li>Order: {orderMode === 'randomized' ? 'Randomized' : 'Manual'}</li>
            <li>
              Timer: {pickTimeSeconds === 0 ? 'No limit' : `${pickTimeSeconds}s`} · Auto-pick:{' '}
              {autoPickOnTimeout ? 'On' : 'Off'}
            </li>
            <li>
              Pool: {preview.playerCount} players, {preview.draftPickCount} picks, ${preview.totalFaab} FAAB
            </li>
          </ul>
          <button
            type="button"
            disabled={launching}
            onClick={() => void launch()}
            className="w-full rounded-xl border border-cyan-400/40 bg-cyan-500/20 py-3 text-sm font-bold text-cyan-50 hover:bg-cyan-500/30 disabled:opacity-50"
          >
            {launching ? 'Launching…' : '🏈 Launch supplemental draft'}
          </button>
        </div>
      ) : null}

      <div className="mt-8 flex justify-between gap-3">
        <button
          type="button"
          disabled={step <= 1}
          onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4 | 5) : s))}
          className="rounded-lg border border-white/15 px-4 py-2 text-xs text-white/80 disabled:opacity-30"
        >
          ← Back
        </button>
        <button
          type="button"
          disabled={
            step >= 5 ||
            previewLoading ||
            (step === 2 && !canContinueFrom2) ||
            (step === 3 && !canContinueFrom3) ||
            (step === 4 && !canContinueFrom4)
          }
          onClick={() => {
            if (step === 2) {
              void (async () => {
                const ok = await runPreview()
                if (ok) setStep(3)
              })()
              return
            }
            setStep((s) => (s < 5 ? ((s + 1) as 1 | 2 | 3 | 4 | 5) : s))
          }}
          className="rounded-lg border border-cyan-400/35 bg-cyan-500/15 px-4 py-2 text-xs font-semibold text-cyan-100 disabled:opacity-30"
        >
          {step === 2 ? (previewLoading ? 'Working…' : 'Continue →') : 'Continue →'}
        </button>
      </div>
    </main>
  )
}
