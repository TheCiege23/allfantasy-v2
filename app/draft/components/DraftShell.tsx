'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient'
import { slotIndexForOverallPick } from '@/lib/draft/snake'
import type {
  DraftMode,
  DraftPickOrderEntry,
  DraftPickRecord,
  DraftPlayerRow,
  DraftStatePayload,
} from '../types'
import { DraftBoard } from './DraftBoard'
import { DraftChatPanel } from './DraftChatPanel'
import { ChimmyDraftChat } from './ChimmyDraftChat'
import { DraftHeader } from './DraftHeader'
import { DraftResultsView } from './DraftResultsView'
import { DraftSettingsModal } from './DraftSettingsModal'
import { DraftTimerBar } from './DraftTimerBar'
import { PlayerPool } from './PlayerPool'
import { QueuePanel } from './QueuePanel'
import { RosterPanel } from './RosterPanel'
import { AutopickToggle } from './AutopickToggle'
import { motion } from 'framer-motion'

type Props = {
  mode: DraftMode
  sessionId: string
  leagueId: string | null
  roomId: string | null
  userId: string
  userName: string
  inviteCode?: string | null
  isCommissioner?: boolean
}

function mapState(raw: Record<string, unknown>): DraftStatePayload {
  return {
    id: String(raw.id),
    mode: String(raw.mode),
    status: String(raw.status),
    currentPick: Number(raw.currentPick),
    currentRound: Number(raw.currentRound),
    currentTeamIndex: Number(raw.currentTeamIndex),
    timerEndsAt: raw.timerEndsAt ? String(raw.timerEndsAt) : null,
    timerPaused: Boolean(raw.timerPaused),
    pickOrder: (raw.pickOrder as DraftStatePayload['pickOrder']) ?? null,
    leagueId: raw.leagueId ? String(raw.leagueId) : null,
    roomId: raw.roomId ? String(raw.roomId) : null,
    numTeams: Number(raw.numTeams),
    numRounds: Number(raw.numRounds),
    timerSeconds: Number(raw.timerSeconds),
    updatedAt: String(raw.updatedAt),
  }
}

function mapPick(raw: Record<string, unknown>): DraftPickRecord {
  return {
    id: String(raw.id),
    round: Number(raw.round),
    pickNumber: Number(raw.pickNumber),
    overallPick: Number(raw.overallPick),
    originalOwnerId: String(raw.originalOwnerId),
    currentOwnerId: String(raw.currentOwnerId),
    playerId: raw.playerId ? String(raw.playerId) : null,
    playerName: raw.playerName ? String(raw.playerName) : null,
    position: raw.position ? String(raw.position) : null,
    team: raw.team ? String(raw.team) : null,
    isTraded: Boolean(raw.isTraded),
    autopicked: Boolean(raw.autopicked),
    timestamp: raw.timestamp ? String(raw.timestamp) : '',
  }
}

export function DraftShell({
  mode,
  sessionId,
  leagueId,
  roomId,
  userId,
  userName,
  inviteCode,
  isCommissioner = false,
}: Props) {
  const [state, setState] = useState<DraftStatePayload | null>(null)
  const [picks, setPicks] = useState<DraftPickRecord[]>([])
  const [queue, setQueue] = useState<DraftPlayerRow[]>([])
  const [autopick, setAutopick] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [chatTab, setChatTab] = useState<'room' | 'chimmy'>('room')

  const load = useCallback(async () => {
    const r = await fetch(`/api/draft/room/state?sessionId=${encodeURIComponent(sessionId)}`)
    if (!r.ok) return
    const j = (await r.json()) as { state?: Record<string, unknown>; picks?: Record<string, unknown>[] }
    if (j.state) setState(mapState(j.state))
    if (j.picks) setPicks(j.picks.map((p) => mapPick(p)))
  }, [sessionId])

  useEffect(() => {
    void load()
    const id = window.setInterval(() => void load(), 3000)
    return () => window.clearInterval(id)
  }, [load])

  useEffect(() => {
    void fetch(`/api/draft/queue/get?sessionId=${encodeURIComponent(sessionId)}`)
      .then((r) => r.json())
      .then((j: { playerIds?: string[] }) => {
        const ids = j.playerIds ?? []
        if (!ids.length) return
        void fetch('/api/draft/players?sport=NFL')
          .then((r) => r.json())
          .then((d: { players?: DraftPlayerRow[] }) => {
            const all = d.players ?? []
            const map = new Map(all.map((p) => [p.id, p]))
            setQueue(ids.map((id) => map.get(id)).filter(Boolean) as DraftPlayerRow[])
          })
      })
  }, [sessionId])

  useEffect(() => {
    if (!isSupabaseConfigured || !state?.id) return
    const ch = supabase
      .channel(`draft-${state.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'draft_room_state', filter: `id=eq.${state.id}` },
        () => void load(),
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(ch)
    }
  }, [state?.id, load])

  const draftedIds = useMemo(() => new Set(picks.map((p) => p.playerId).filter(Boolean) as string[]), [picks])

  const order = (state?.pickOrder ?? []) as DraftPickOrderEntry[]
  const currentOverall = state?.currentPick ?? 1
  const numT = state?.numTeams ?? 12
  const slotIdx = slotIndexForOverallPick(currentOverall, numT)
  const onClockId = order[slotIdx]?.id ?? ''
  const canDraft = Boolean(state?.status === 'active' && onClockId === userId)

  const myPicks = useMemo(() => {
    if (mode === 'live') {
      return picks.filter((p) => p.pickedById === userId)
    }
    return picks.filter((p) => p.currentOwnerId === userId)
  }, [picks, userId, mode])

  const onDraft = async (p: DraftPlayerRow) => {
    const r = await fetch('/api/draft/pick/make', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        playerId: p.id,
        playerName: p.name,
        position: p.position,
        team: p.team,
        mode,
      }),
    })
    if (r.ok) {
      await fetch('/api/draft/worker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      if (mode === 'mock') {
        for (let i = 0; i < 20; i++) {
          const cpu = await fetch('/api/draft/mock/cpu-pick', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          })
          if (!cpu.ok) break
        }
      }
      void load()
    }
  }

  const onQueueAdd = (p: DraftPlayerRow) => {
    if (queue.some((q) => q.id === p.id)) return
    setQueue((q) => [...q, p])
  }

  const toggleAutopick = async (v: boolean) => {
    setAutopick(v)
    await fetch('/api/draft/autopick/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, enabled: v }),
    })
  }

  const startDraft = async () => {
    await fetch('/api/draft/room/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
    void load()
  }

  if (!state) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0d1117] text-white/50">
        Loading draft…
      </div>
    )
  }

  if (state.status === 'complete') {
    return (
      <div className="min-h-screen bg-[#0d1117]">
        <DraftResultsView state={state} picks={picks} sessionId={sessionId} />
      </div>
    )
  }

  const onClockLabel = order[slotIdx]?.label ?? '—'

  return (
    <motion.div
      className="flex min-h-screen flex-col bg-[#0d1117] text-white"
      initial={{ opacity: 0.96 }}
      animate={{ opacity: 1 }}
    >
      <DraftHeader
        title={mode === 'mock' ? 'Mock draft' : 'Live draft'}
        subtitle={leagueId ? `League ${leagueId.slice(0, 8)}…` : roomId ? `Room ${roomId.slice(0, 8)}…` : undefined}
        onOpenSettings={mode === 'mock' ? () => setSettingsOpen(true) : undefined}
        rightSlot={
          <div className="flex items-center gap-2">
            <AutopickToggle enabled={autopick} onChange={(v) => void toggleAutopick(v)} />
            {state.status === 'waiting' ? (
              <button
                type="button"
                onClick={() => void startDraft()}
                className="rounded-lg bg-cyan-500 px-3 py-1 text-[11px] font-bold text-black"
              >
                Start draft
              </button>
            ) : null}
          </div>
        }
      />

      <div className="border-b border-white/[0.06] px-3 py-2">
        <DraftTimerBar
          timerEndsAt={state.timerEndsAt}
          timerPaused={state.timerPaused}
          onTheClockLabel={onClockLabel}
          isCommissioner={isCommissioner}
          onPause={() =>
            void fetch('/api/draft/timer/pause', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId }),
            }).then(() => load())
          }
          onResume={() =>
            void fetch('/api/draft/timer/resume', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId }),
            }).then(() => load())
          }
          autopickActive={autopick}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-2 py-2">
        <DraftBoard
          numTeams={state.numTeams}
          numRounds={state.numRounds}
          pickOrder={order}
          picks={picks}
          currentOverall={currentOverall}
        />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 px-2 pb-4 lg:grid-cols-10 lg:gap-3">
        <div className="lg:col-span-4">
          <PlayerPool
            draftedIds={draftedIds}
            onDraft={(p) => void onDraft(p)}
            onQueue={onQueueAdd}
            canDraft={canDraft}
          />
        </div>
        <div className="lg:col-span-2">
          <QueuePanel sessionId={sessionId} queue={queue} onQueueChange={setQueue} />
        </div>
        <div className="lg:col-span-2">
          <RosterPanel myPicks={myPicks} />
        </div>
        <div className="flex min-h-[280px] flex-col gap-2 lg:col-span-2">
          <div className="flex gap-1 border-b border-white/[0.06] pb-1">
            <button
              type="button"
              onClick={() => setChatTab('room')}
              className={`rounded px-2 py-1 text-[10px] font-semibold ${
                chatTab === 'room' ? 'bg-white/10 text-white' : 'text-white/40'
              }`}
            >
              Draft Chat
            </button>
            <button
              type="button"
              onClick={() => setChatTab('chimmy')}
              className={`rounded px-2 py-1 text-[10px] font-semibold ${
                chatTab === 'chimmy' ? 'bg-cyan-500/20 text-cyan-200' : 'text-white/40'
              }`}
            >
              Chimmy ✨
            </button>
          </div>
          <div className="min-h-0 flex-1">
            {chatTab === 'room' ? (
              <DraftChatPanel sessionId={sessionId} mode={mode} />
            ) : (
              <ChimmyDraftChat
                sessionId={sessionId}
                context={{
                  userName,
                  state,
                  picks,
                }}
              />
            )}
          </div>
        </div>
      </div>

      <DraftSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        roomId={roomId}
        inviteCode={inviteCode ?? null}
        onStart={() => void startDraft()}
      />
    </motion.div>
  )
}
