'use client'

import { useEffect, useState } from 'react'
import type { CommissionerSettingsFormData } from '@/lib/league/commissioner-league-patch'
import { SettingsSection, SettingsRow, Toggle } from '../../../tabs/settings/components'
import type { SurvivorSettingsPanelProps } from './types'
import { SubscriptionGateBadge } from '@/components/subscription/SubscriptionGateBadge'
import { useSubscriptionGateOptional } from '@/hooks/useSubscriptionGate'

export function SurvivorAIHostPanel({
  canEdit,
  hasAfCommissionerSub,
  initialData,
  debouncedSave,
}: SurvivorSettingsPanelProps & {
  initialData: CommissionerSettingsFormData
  debouncedSave: (partial: Record<string, unknown>, delayMs?: number) => void
}) {
  const [hostOn, setHostOn] = useState(Boolean(initialData.aiChimmyEnabled))
  const [autoPost, setAutoPost] = useState(true)
  const [requireApproval, setRequireApproval] = useState(false)
  const [aiChallenges, setAiChallenges] = useState(false)
  const [recaps, setRecaps] = useState(Boolean(initialData.aiRecaps))
  const [alerts, setAlerts] = useState(Boolean(initialData.leagueAiCommissionerAlerts))
  const [betrayal, setBetrayal] = useState(false)
  const [rivalry, setRivalry] = useState(false)
  const [finaleRecap, setFinaleRecap] = useState(false)
  const [confessional, setConfessional] = useState(false)
  const [confHighlight, setConfHighlight] = useState(false)
  const d = !canEdit
  const sub = hasAfCommissionerSub
  const subscriptionGate = useSubscriptionGateOptional()

  useEffect(() => {
    setHostOn(Boolean(initialData.aiChimmyEnabled))
    setRecaps(Boolean(initialData.aiRecaps))
    setAlerts(Boolean(initialData.leagueAiCommissionerAlerts))
  }, [initialData])

  return (
    <div className="space-y-5 px-6 py-6 text-[13px] text-white/85">
      <p className="text-[11px] text-amber-200/80">
        Chimmy / AI host toggles that already exist on the league record save via autosave. AfSub-gated rows show a lock when
        needed.
      </p>
      <SettingsSection id="sv-ai-host" title="AI host settings">
        <SettingsRow
          label="AI host enabled"
          description="Maps to league AI Chimmy flag."
          control={
            <Toggle
              checked={hostOn}
              disabled={d}
              onChange={(v) => {
                setHostOn(v)
                debouncedSave({ aiChimmyEnabled: v })
              }}
            />
          }
        />
        <SettingsRow label="Auto-post announcements" control={<Toggle checked={autoPost} onChange={setAutoPost} disabled={d} />} />
        <SettingsRow
          label="Require approval before posting"
          control={<Toggle checked={requireApproval} onChange={setRequireApproval} disabled={d} />}
        />
      </SettingsSection>
      <SettingsSection id="sv-ai-chal" title="AI challenge creation" description="AF Commissioner Subscription">
        <SettingsRow
          label="AI generates challenges"
          control={
            <div className="flex items-center gap-2">
              <Toggle
                checked={aiChallenges}
                onChange={(v) => {
                  if (!sub) {
                    subscriptionGate?.gate('commissioner_ai_tools')
                    return
                  }
                  setAiChallenges(v)
                }}
                disabled={d}
              />
              {!sub ? (
                <SubscriptionGateBadge
                  featureId="commissioner_ai_tools"
                  onClick={() => subscriptionGate?.gate('commissioner_ai_tools')}
                />
              ) : null}
            </div>
          }
        />
        {!sub ? (
          <p className="text-[11px] text-white/35">Upgrade to unlock AfSub challenge generation.</p>
        ) : null}
      </SettingsSection>
      <SettingsSection id="sv-ai-story" title="AI storylines" description="Uses existing league recap + alert fields where applicable.">
        <SettingsRow
          label="Episode recaps"
          control={
            <div className="flex items-center gap-2">
              <Toggle
                checked={recaps}
                disabled={d}
                onChange={(v) => {
                  if (!sub) {
                    subscriptionGate?.gate('commissioner_ai_recap', { highlightFeature: 'ai_recap' })
                    return
                  }
                  setRecaps(v)
                  debouncedSave({ aiRecaps: v })
                }}
              />
              {!sub ? (
                <SubscriptionGateBadge
                  featureId="commissioner_ai_recap"
                  onClick={() =>
                    subscriptionGate?.gate('commissioner_ai_recap', { highlightFeature: 'ai_recap' })
                  }
                />
              ) : null}
            </div>
          }
        />
        <SettingsRow
          label="Commissioner AI alerts"
          control={
            <Toggle
              checked={alerts}
              disabled={d}
              onChange={(v) => {
                setAlerts(v)
                debouncedSave({ leagueAiCommissionerAlerts: v })
              }}
            />
          }
        />
        <SettingsRow
          label="Betrayal arcs"
          control={
            <div className="flex items-center gap-2">
              <Toggle
                checked={betrayal}
                onChange={(v) => {
                  if (!sub) {
                    subscriptionGate?.gate('commissioner_ai_narration', { highlightFeature: 'ai_narration' })
                    return
                  }
                  setBetrayal(v)
                }}
                disabled={d}
              />
              {!sub ? (
                <SubscriptionGateBadge
                  featureId="commissioner_ai_narration"
                  onClick={() =>
                    subscriptionGate?.gate('commissioner_ai_narration', { highlightFeature: 'ai_narration' })
                  }
                />
              ) : null}
            </div>
          }
        />
        <SettingsRow
          label="Rivalry tracking"
          control={
            <div className="flex items-center gap-2">
              <Toggle
                checked={rivalry}
                onChange={(v) => {
                  if (!sub) {
                    subscriptionGate?.gate('commissioner_ai_narration', { highlightFeature: 'ai_narration' })
                    return
                  }
                  setRivalry(v)
                }}
                disabled={d}
              />
              {!sub ? (
                <SubscriptionGateBadge
                  featureId="commissioner_ai_narration"
                  onClick={() =>
                    subscriptionGate?.gate('commissioner_ai_narration', { highlightFeature: 'ai_narration' })
                  }
                />
              ) : null}
            </div>
          }
        />
        <SettingsRow
          label="Finale recap"
          control={
            <div className="flex items-center gap-2">
              <Toggle
                checked={finaleRecap}
                onChange={(v) => {
                  if (!sub) {
                    subscriptionGate?.gate('commissioner_ai_narration', { highlightFeature: 'ai_narration' })
                    return
                  }
                  setFinaleRecap(v)
                }}
                disabled={d}
              />
              {!sub ? (
                <SubscriptionGateBadge
                  featureId="commissioner_ai_narration"
                  onClick={() =>
                    subscriptionGate?.gate('commissioner_ai_narration', { highlightFeature: 'ai_narration' })
                  }
                />
              ) : null}
            </div>
          }
        />
      </SettingsSection>
      <SettingsSection id="sv-ai-conf" title="AI confessionals">
        <SettingsRow
          label="Confessional system"
          control={
            <div className="flex items-center gap-2">
              <Toggle
                checked={confessional}
                onChange={(v) => {
                  if (!sub) {
                    subscriptionGate?.gate('commissioner_ai_copilot')
                    return
                  }
                  setConfessional(v)
                }}
                disabled={d}
              />
              {!sub ? (
                <SubscriptionGateBadge
                  featureId="commissioner_ai_copilot"
                  onClick={() => subscriptionGate?.gate('commissioner_ai_copilot')}
                />
              ) : null}
            </div>
          }
        />
        <SettingsRow
          label="Post-season highlights"
          control={
            <div className="flex items-center gap-2">
              <Toggle
                checked={confHighlight}
                onChange={(v) => {
                  if (!sub) {
                    subscriptionGate?.gate('commissioner_ai_copilot')
                    return
                  }
                  setConfHighlight(v)
                }}
                disabled={d}
              />
              {!sub ? (
                <SubscriptionGateBadge
                  featureId="commissioner_ai_copilot"
                  onClick={() => subscriptionGate?.gate('commissioner_ai_copilot')}
                />
              ) : null}
            </div>
          }
        />
      </SettingsSection>
    </div>
  )
}
