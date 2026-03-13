'use client'

import { useState, useCallback } from 'react'
import { MockDraftSetup, MockDraftRecap } from '@/components/mock-draft'
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

interface MockDraftSimulatorWrapperProps {
  leagues: LeagueOption[]
}

export default function MockDraftSimulatorWrapper({ leagues }: MockDraftSimulatorWrapperProps) {
  const [showSetup, setShowSetup] = useState(true)
  const [mockConfig, setMockConfig] = useState<MockDraftConfig | null>(null)
  const [showRecap, setShowRecap] = useState(false)
  const [recapResults, setRecapResults] = useState<DraftPick[]>([])
  const [recapDraftId, setRecapDraftId] = useState<string | null>(null)
  const [userManagerName, setUserManagerName] = useState<string | null>(null)

  const handleStart = useCallback((config: MockDraftConfig) => {
    setMockConfig(config)
    setShowSetup(false)
  }, [])

  const handleDraftComplete = useCallback((results: DraftPick[], draftId: string | null) => {
    setRecapResults(results)
    setRecapDraftId(draftId)
    setUserManagerName(results.find((p) => p.isUser)?.manager ?? null)
    setShowRecap(true)
  }, [])

  if (showRecap) {
    return (
      <div className="space-y-6">
        <MockDraftRecap
          results={recapResults}
          config={mockConfig}
          userManagerName={userManagerName}
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

  return (
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
      onDraftComplete={handleDraftComplete}
      showAIAssistantPanel={mockConfig?.aiEnabled ?? false}
    />
  )
}
