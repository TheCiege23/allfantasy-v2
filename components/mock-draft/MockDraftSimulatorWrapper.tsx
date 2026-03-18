'use client'

import { useState, useCallback, useEffect } from 'react'
import { Play, RotateCcw, Loader2 } from 'lucide-react'
import { MockDraftSetup, MockDraftRecap } from '@/components/mock-draft'
import { MockDraftInviteLink } from '@/components/mock-draft/MockDraftInviteLink'
import { MockDraftChatPanel } from '@/components/mock-draft/MockDraftChatPanel'
import MockDraftSimulatorClient from '@/components/MockDraftSimulatorClient'
import type { MockDraftConfig } from '@/lib/mock-draft/types'

interface DraftPick {
  round: number
  pick: number
  overall: number
  playerName: string
  position: string
  team: string
  manager: string
  managerAvatar?: string
  confidence?: number
  isUser: boolean
  value?: number
  notes?: string
  isBotPick?: boolean
}

interface LeagueOption {
  id: string
  name: string
  platform: string
  leagueSize?: number
  isDynasty?: boolean
  scoring?: string | null
  sport?: string
}

type SessionDraft = {
  id: string
  inviteLink: string | null
  status: string
}

interface MockDraftSimulatorWrapperProps {
  leagues: LeagueOption[]
  /** When opening room via invite or link, pass existing session so we show invite/start/reset/chat */
  initialSessionDraft?: SessionDraft | null
}

export default function MockDraftSimulatorWrapper({ leagues, initialSessionDraft = null }: MockDraftSimulatorWrapperProps) {
  const [showSetup, setShowSetup] = useState(!initialSessionDraft)
  const [mockConfig, setMockConfig] = useState<MockDraftConfig | null>(null)
  const [sessionDraft, setSessionDraft] = useState<SessionDraft | null>(initialSessionDraft ?? null)

  useEffect(() => {
    if (initialSessionDraft?.id) {
      setSessionDraft(initialSessionDraft)
      setShowSetup(false)
    }
  }, [initialSessionDraft?.id, initialSessionDraft?.inviteLink, initialSessionDraft?.status])
  const [showRecap, setShowRecap] = useState(false)
  const [recapResults, setRecapResults] = useState<DraftPick[]>([])
  const [recapDraftId, setRecapDraftId] = useState<string | null>(null)
  const [userManagerName, setUserManagerName] = useState<string | null>(null)
  const [startResetLoading, setStartResetLoading] = useState(false)

  const handleStart = useCallback(async (config: MockDraftConfig) => {
    setMockConfig(config)
    try {
      const res = await fetch('/api/mock-draft/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          numTeams: config.numTeams,
          rounds: config.rounds,
          timerSeconds: config.timerSeconds,
          poolType: config.poolType ?? 'all',
          rosterSize: config.rosterSize,
          useSession: true,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.draftId) {
        setSessionDraft({
          id: data.draftId,
          inviteLink: data.inviteLink ?? null,
          status: data.status ?? 'pre_draft',
        })
      }
    } catch {
      // proceed without session (no invite link)
    }
    setShowSetup(false)
  }, [])

  const handleDraftComplete = useCallback((results: DraftPick[], draftId: string | null) => {
    setRecapResults(results)
    setRecapDraftId(draftId)
    setUserManagerName(results.find((p) => p.isUser)?.manager ?? null)
    setShowRecap(true)
  }, [])

  if (showRecap) {
    const recapLeagueId = mockConfig?.leagueId ?? leagues[0]?.id ?? null
    return (
      <div className="space-y-6">
        <MockDraftRecap
          results={recapResults}
          config={mockConfig}
          userManagerName={userManagerName}
          leagueId={recapLeagueId}
          onBack={() => setShowRecap(false)}
        />
      </div>
    )
  }

  if (showSetup) {
    return (
      <div className="max-w-2xl mx-auto">
        <MockDraftSetup
          leagueOptions={leagues.map((l) => ({
            id: l.id,
            name: l.name,
            leagueSize: l.leagueSize,
            isDynasty: l.isDynasty,
            scoring: l.scoring ?? null,
            sport: l.sport,
          }))}
          onStart={handleStart}
        />
        <p className="mt-4 text-center text-sm text-white/50">
          Or skip setup and use the flow below to select a league and run a mock draft.
        </p>
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setShowSetup(false)}
            className="text-sm text-cyan-400 hover:text-cyan-300 underline"
          >
            Go to league selector
          </button>
        </div>
      </div>
    )
  }

  const leaguesWithSize = leagues.map((l) => ({
    ...l,
    leagueSize: l.leagueSize ?? 12,
    isDynasty: l.isDynasty ?? false,
    scoring: l.scoring ?? null,
  }))

  const handleStartDraft = useCallback(async () => {
    if (!sessionDraft?.id || sessionDraft.status !== 'pre_draft') return
    setStartResetLoading(true)
    try {
      const res = await fetch(`/api/mock-draft/${sessionDraft.id}/start`, { method: 'POST' })
      if (res.ok) setSessionDraft((prev) => (prev ? { ...prev, status: 'in_progress' } : null))
    } finally {
      setStartResetLoading(false)
    }
  }, [sessionDraft?.id, sessionDraft?.status])

  const handleResetDraft = useCallback(async () => {
    if (!sessionDraft?.id) return
    setStartResetLoading(true)
    try {
      const res = await fetch(`/api/mock-draft/${sessionDraft.id}/reset`, { method: 'POST' })
      if (res.ok) setSessionDraft((prev) => (prev ? { ...prev, status: 'pre_draft' } : null))
    } finally {
      setStartResetLoading(false)
    }
  }, [sessionDraft?.id])

  return (
    <div className="space-y-4">
      {sessionDraft && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/12 bg-black/25 p-3">
          <MockDraftInviteLink
            inviteLink={sessionDraft.inviteLink}
            draftId={sessionDraft.id}
            status={sessionDraft.status}
          />
          {sessionDraft.status === 'pre_draft' && (
            <>
              <button
                type="button"
                onClick={handleStartDraft}
                disabled={startResetLoading}
                className="inline-flex items-center gap-2 rounded-xl border border-green-500/40 bg-green-500/15 px-3 py-2 text-xs font-medium text-green-200 hover:bg-green-500/25 disabled:opacity-50"
              >
                {startResetLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                Start draft
              </button>
              <button
                type="button"
                onClick={handleResetDraft}
                disabled={startResetLoading}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-xs font-medium text-amber-200 hover:bg-amber-500/25 disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            </>
          )}
        </div>
      )}
      {sessionDraft && <MockDraftChatPanel draftId={sessionDraft.id} />}
      <MockDraftSimulatorClient
        leagues={leaguesWithSize}
        initialLeagueId={mockConfig?.leagueId ?? ''}
        initialConfig={
          mockConfig
            ? {
                rounds: mockConfig.rounds,
                draftType: mockConfig.draftType,
                scoring: mockConfig.scoringFormat,
                aiEnabled: mockConfig.aiEnabled,
              }
            : undefined
        }
        initialDraftId={sessionDraft?.id ?? null}
        onDraftComplete={handleDraftComplete}
        showAIAssistantPanel={mockConfig?.aiEnabled ?? false}
      />
    </div>
  )
}
