'use client'

import { useEffect, useState } from 'react'
import type { CommissionerSettingsFormData } from '@/lib/league/commissioner-league-patch'
import { useAutosave } from '@/lib/hooks/useAutosave'
import { LeagueSettingsPanel } from './settings/LeagueSettingsPanel'
import { PlaceholderPanel } from './settings/PlaceholderPanel'
import { SettingsNav, type SettingsNavTabId } from './settings/SettingsNav'

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

  if (!isOpen) return null

  const canEdit = payload?.canEdit ?? false
  const hasSub = payload?.hasAfCommissionerSub ?? false
  const initialData = payload?.league as CommissionerSettingsFormData | undefined

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="commissioner-settings-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative flex h-[85vh] w-full max-w-[900px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d1117] shadow-2xl">
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

        <SettingsNav activeTab={activeTab} onSelect={setActiveTab} saveStatus={status} />

        <div className="min-h-0 flex-1 overflow-y-auto">
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
            <PlaceholderPanel title="Commissioner Control" />
          ) : activeTab === 'previous' ? (
            <PlaceholderPanel title="Previous Leagues" />
          ) : activeTab === 'delete' ? (
            <PlaceholderPanel title="Delete League" />
          ) : (
            <PlaceholderPanel title="Settings" />
          )}
        </div>
      </div>
    </div>
  )
}
