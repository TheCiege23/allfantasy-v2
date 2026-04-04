'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { CommissionerSettingsFormData } from '@/lib/league/commissioner-league-patch'
import { useAutosave } from '@/lib/hooks/useAutosave'
import { LeagueSettingsPanel } from './settings/LeagueSettingsPanel'
import { PlaceholderPanel } from './settings/PlaceholderPanel'
import {
  SettingsNav,
  type SettingsNavTabId,
  isSurvivorSettingsTab,
  isZombieSettingsTab,
} from './settings/SettingsNav'
import { KeeperCommissionerDashboard } from './KeeperCommissionerDashboard'
import { SurvivorSetupPanel } from './settings/survivor/SurvivorSetupPanel'
import { SurvivorTribesPanel } from './settings/survivor/SurvivorTribesPanel'
import { SurvivorChallengesPanel } from './settings/survivor/SurvivorChallengesPanel'
import { SurvivorTribalPanel } from './settings/survivor/SurvivorTribalPanel'
import { SurvivorIdolsPanel } from './settings/survivor/SurvivorIdolsPanel'
import { SurvivorExilePanel } from './settings/survivor/SurvivorExilePanel'
import { SurvivorMergeJuryPanel } from './settings/survivor/SurvivorMergeJuryPanel'
import { SurvivorChatPanel } from './settings/survivor/SurvivorChatPanel'
import { SurvivorAIHostPanel } from './settings/survivor/SurvivorAIHostPanel'
import { SurvivorAdvancedPanel } from './settings/survivor/SurvivorAdvancedPanel'
import { ZombieSetupPanel } from '@/app/zombie/components/commissioner/ZombieSetupPanel'
import { ZombieWhispererPanel } from '@/app/zombie/components/commissioner/ZombieWhispererPanel'
import { ZombieCombatPanel } from '@/app/zombie/components/commissioner/ZombieCombatPanel'
import { ZombieItemsPanel } from '@/app/zombie/components/commissioner/ZombieItemsPanel'
import { ZombiePaidPanel } from '@/app/zombie/components/commissioner/ZombiePaidPanel'
import { ZombieUniversePanel } from '@/app/zombie/components/commissioner/ZombieUniversePanel'
import { ZombieUpdatesPanel } from '@/app/zombie/components/commissioner/ZombieUpdatesPanel'
import { ZombieAIPanel } from '@/app/zombie/components/commissioner/ZombieAIPanel'

type ApiGet = {
  userRole: 'commissioner' | 'co_commissioner' | 'member' | null
  hasAfCommissionerSub: boolean
  canEdit: boolean
  league: CommissionerSettingsFormData & Record<string, unknown>
}

export function CommissionerSettingsModal({
  leagueId,
  isOpen,
  onClose,
}: {
  leagueId: string
  isOpen: boolean
  onClose: () => void
}) {
  const [activeTab, setActiveTab] = useState<SettingsNavTabId>('league')
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [payload, setPayload] = useState<ApiGet | null>(null)
  const [survivorMode, setSurvivorMode] = useState(false)
  const [tournamentShellId, setTournamentShellId] = useState<string | null>(null)
  const [zombieMode, setZombieMode] = useState(false)

  const { status, save, debouncedSave } = useAutosave(leagueId)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    setLoadError(false)
    fetch(`/api/league/settings?leagueId=${encodeURIComponent(leagueId)}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: ApiGet) => setPayload(data))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [isOpen, leagueId])

  useEffect(() => {
    if (!isOpen || !leagueId) return
    fetch(`/api/survivor/season?leagueId=${encodeURIComponent(leagueId)}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { mode?: boolean } | null) => setSurvivorMode(Boolean(d?.mode)))
      .catch(() => setSurvivorMode(false))
  }, [isOpen, leagueId])

  useEffect(() => {
    if (!isOpen || !leagueId) return
    fetch(`/api/zombie/league?leagueId=${encodeURIComponent(leagueId)}`, { credentials: 'include' })
      .then((r) => setZombieMode(r.ok))
      .catch(() => setZombieMode(false))
  }, [isOpen, leagueId])

  useEffect(() => {
    if (!isOpen) {
      setTournamentShellId(null)
      return
    }
    fetch(`/api/league/detail?leagueId=${encodeURIComponent(leagueId)}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { settings?: Record<string, unknown> } | null) => {
        const sid =
          data?.settings && typeof data.settings.tournamentShellId === 'string'
            ? data.settings.tournamentShellId
            : null
        setTournamentShellId(sid)
      })
      .catch(() => setTournamentShellId(null))
  }, [isOpen, leagueId])

  useEffect(() => {
    if (!survivorMode && isSurvivorSettingsTab(activeTab)) {
      setActiveTab('league')
    }
  }, [survivorMode, activeTab])

  useEffect(() => {
    if (!zombieMode && isZombieSettingsTab(activeTab)) {
      setActiveTab('league')
    }
  }, [zombieMode, activeTab])

  if (!isOpen) return null

  const canEdit = payload?.canEdit ?? false
  const hasSub = payload?.hasAfCommissionerSub ?? false
  const initialData = payload?.league as CommissionerSettingsFormData | undefined

  const survivorProps = { leagueId, canEdit, hasAfCommissionerSub: hasSub }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="commissioner-settings-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative flex h-[85vh] w-full max-w-[900px] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d1117] shadow-2xl md:flex-row">
        <h2 id="commissioner-settings-title" className="sr-only">
          Commissioner settings
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-[14px] text-white/50 transition-colors hover:bg-white/[0.12] hover:text-white"
          aria-label="Close settings"
        >
          ✕
        </button>

        <SettingsNav
          activeTab={activeTab}
          onSelect={setActiveTab}
          saveStatus={status}
          showSurvivorTabs={survivorMode}
          showZombieTabs={zombieMode}
        />

        <div className="min-h-0 flex-1 overflow-y-auto">
          {tournamentShellId ? (
            <div className="border-b border-cyan-500/25 bg-cyan-500/10 px-4 py-3 text-[12px] text-cyan-50">
              <p className="font-semibold text-white">
                Managing tournament league ·{' '}
                {payload?.league && typeof (payload.league as { name?: string }).name === 'string'
                  ? (payload.league as { name?: string }).name
                  : 'This league'}
              </p>
              <p className="mt-1 text-[11px] text-cyan-100/80">
                Linked to a Tournament Shell — open the hub for national-style navigation and shell commissioner
                tools.
              </p>
              <Link
                href={`/tournament/${tournamentShellId}`}
                className="mt-2 inline-flex font-semibold text-cyan-300 underline hover:text-cyan-200"
                data-testid="commissioner-tournament-hub-link"
              >
                Manage full tournament settings →
              </Link>
            </div>
          ) : null}
          {loading ? (
            <div className="space-y-3 px-6 py-8">
              <div className="h-10 animate-pulse rounded-xl bg-white/[0.06]" />
              <div className="h-10 animate-pulse rounded-xl bg-white/[0.06]" />
              <div className="h-10 animate-pulse rounded-xl bg-white/[0.06]" />
            </div>
          ) : loadError || !initialData ? (
            <div className="px-6 py-10 text-center text-[13px] text-red-400">
              Could not load league settings. Try again.
            </div>
          ) : activeTab === 'league' ? (
            <LeagueSettingsPanel
              leagueId={leagueId}
              initialData={initialData}
              hasAfCommissionerSub={hasSub}
              canEdit={canEdit}
              save={save}
              debouncedSave={debouncedSave}
            />
          ) : activeTab === 'team' ? (
            <PlaceholderPanel title="Team Settings" />
          ) : activeTab === 'roster' ? (
            <PlaceholderPanel title="Roster Settings" />
          ) : activeTab === 'scoring' ? (
            <PlaceholderPanel title="Scoring Settings" />
          ) : activeTab === 'draft' ? (
            <PlaceholderPanel title="Draft Settings" />
          ) : activeTab === 'divisions' ? (
            <PlaceholderPanel title="Division Settings" />
          ) : activeTab === 'members' ? (
            <PlaceholderPanel title="Member Settings" />
          ) : activeTab === 'coowners' ? (
            <PlaceholderPanel title="Co-owner Settings" />
          ) : activeTab === 'commissioner' ? (
            initialData?.leagueType === 'keeper' ? (
              <KeeperCommissionerDashboard leagueId={leagueId} />
            ) : (
              <PlaceholderPanel title="Commissioner Control" />
            )
          ) : activeTab === 'previous' ? (
            <PlaceholderPanel title="Previous Leagues" />
          ) : activeTab === 'delete' ? (
            <PlaceholderPanel title="Delete League" />
          ) : activeTab === 'survivor_setup' ? (
            <SurvivorSetupPanel {...survivorProps} />
          ) : activeTab === 'survivor_tribes' ? (
            <SurvivorTribesPanel {...survivorProps} />
          ) : activeTab === 'survivor_challenges' ? (
            <SurvivorChallengesPanel {...survivorProps} />
          ) : activeTab === 'survivor_tribal' ? (
            <SurvivorTribalPanel {...survivorProps} />
          ) : activeTab === 'survivor_idols' ? (
            <SurvivorIdolsPanel {...survivorProps} />
          ) : activeTab === 'survivor_exile' ? (
            <SurvivorExilePanel {...survivorProps} />
          ) : activeTab === 'survivor_merge' ? (
            <SurvivorMergeJuryPanel {...survivorProps} />
          ) : activeTab === 'survivor_chat' ? (
            <SurvivorChatPanel {...survivorProps} />
          ) : activeTab === 'survivor_ai' ? (
            <SurvivorAIHostPanel {...survivorProps} initialData={initialData} debouncedSave={debouncedSave} />
          ) : activeTab === 'survivor_advanced' ? (
            <SurvivorAdvancedPanel {...survivorProps} />
          ) : activeTab === 'zombie_setup' ? (
            <ZombieSetupPanel leagueId={leagueId} canEdit={canEdit} />
          ) : activeTab === 'zombie_whisperer' ? (
            <ZombieWhispererPanel canEdit={canEdit} />
          ) : activeTab === 'zombie_combat' ? (
            <ZombieCombatPanel canEdit={canEdit} />
          ) : activeTab === 'zombie_items' ? (
            <ZombieItemsPanel canEdit={canEdit} />
          ) : activeTab === 'zombie_paid' ? (
            <ZombiePaidPanel canEdit={canEdit} />
          ) : activeTab === 'zombie_universe' ? (
            <ZombieUniversePanel canEdit={canEdit} />
          ) : activeTab === 'zombie_updates' ? (
            <ZombieUpdatesPanel leagueId={leagueId} canEdit={canEdit} />
          ) : activeTab === 'zombie_ai' ? (
            <ZombieAIPanel hasAfSub={hasSub} />
          ) : (
            <PlaceholderPanel title="Settings" />
          )}
        </div>
      </div>
    </div>
  )
}
