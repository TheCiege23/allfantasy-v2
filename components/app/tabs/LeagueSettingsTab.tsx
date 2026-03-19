'use client'

import { useState } from 'react'
import GeneralSettingsPanel from '@/components/app/settings/GeneralSettingsPanel'
import TeamSettingsPanel from '@/components/app/settings/TeamSettingsPanel'
import RosterSettingsPanel from '@/components/app/settings/RosterSettingsPanel'
import ScoringSettingsPanel from '@/components/app/settings/ScoringSettingsPanel'
import DraftSettingsPanel from '@/components/app/settings/DraftSettingsPanel'
import AISettingsPanel from '@/components/app/settings/AISettingsPanel'
import AutomationSettingsPanel from '@/components/app/settings/AutomationSettingsPanel'
import WaiverSettingsPanel from '@/components/app/settings/WaiverSettingsPanel'
import PlayoffSettingsPanel from '@/components/app/settings/PlayoffSettingsPanel'
import ScheduleSettingsPanel from '@/components/app/settings/ScheduleSettingsPanel'
import DivisionSettingsPanel from '@/components/app/settings/DivisionSettingsPanel'
import MemberSettingsPanel from '@/components/app/settings/MemberSettingsPanel'
import CommissionerControlsPanel from '@/components/app/settings/CommissionerControlsPanel'
import LeaguePrivacyAndInvitesPanel from '@/components/app/settings/LeaguePrivacyAndInvitesPanel'
import BehaviorProfilesPanel from '@/components/app/settings/BehaviorProfilesPanel'
import LeagueDramaPanel from '@/components/app/settings/LeagueDramaPanel'
import ReputationPanel from '@/components/app/settings/ReputationPanel'
import GMEconomyPanel from '@/components/app/settings/GMEconomyPanel'
import RulesInfoPanel from '@/components/app/settings/RulesInfoPanel'
import LeagueTemplatesPanel from '@/components/app/settings/LeagueTemplatesPanel'
import PreviousLeaguesPanel from '@/components/app/settings/PreviousLeaguesPanel'
import ResetLeaguePanel from '@/components/app/settings/ResetLeaguePanel'
import DeleteLeaguePanel from '@/components/app/settings/DeleteLeaguePanel'
import { DevySettingsPanel } from '@/components/devy/DevySettingsPanel'
import { MergedDevyC2CCommissionerSettings } from '@/components/merged-devy-c2c/MergedDevyC2CCommissionerSettings'
import { BigBrotherSettingsPanel } from '@/components/big-brother/BigBrotherSettingsPanel'
import { IDPSettingsPanel } from '@/components/idp/IDPSettingsPanel'
import DynastySettingsPanel from '@/components/app/settings/DynastySettingsPanel'
import type { LeagueTabProps } from '@/components/app/tabs/types'

const SUBTABS_BASE = [
  'General',
  'Templates',
  'Privacy & invites',
  'Team Settings',
  'Roster Settings',
  'Scoring Settings',
  'Dynasty Settings',
  'Draft Settings',
  'AI Settings',
  'Automation Settings',
  'Waiver Settings',
  'Playoff Settings',
  'Schedule Settings',
  'Division Settings',
  'Member Settings',
  'Commissioner Controls',
  'Behavior Profiles',
  'League Drama',
  'Reputation',
  'GM Economy',
  'Rules & Info',
  'Previous Leagues',
  'Reset League',
  'Delete League',
] as const

const SUBTABS = [...SUBTABS_BASE, 'Devy Settings', 'C2C Settings', 'Big Brother Settings', 'IDP Settings'] as const
type SettingsSubtab = (typeof SUBTABS)[number]

export default function LeagueSettingsTab({
  leagueId,
  isDynasty,
  isDevyDynasty,
  isMergedDevyC2C,
  isBigBrother,
  isIdp,
  isCommissioner,
}: LeagueTabProps & { isDynasty?: boolean; isDevyDynasty?: boolean; isMergedDevyC2C?: boolean; isBigBrother?: boolean; isIdp?: boolean; isCommissioner?: boolean }) {
  const [active, setActive] = useState<SettingsSubtab>('General')
  const showDynastySettings = !!(isDynasty || isDevyDynasty || isMergedDevyC2C)
  const visibleSubtabs = SUBTABS.filter(
    (tab) =>
      (tab !== 'Dynasty Settings' || showDynastySettings) &&
      (tab !== 'Devy Settings' || isDevyDynasty) &&
      (tab !== 'C2C Settings' || isMergedDevyC2C) &&
      (tab !== 'Big Brother Settings' || isBigBrother) &&
      (tab !== 'IDP Settings' || isIdp)
  )

  return (
    <section className="space-y-4">
      <div className="flex gap-2 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03] p-2">
        {visibleSubtabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActive(tab)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs transition ${active === tab ? 'bg-white text-black' : 'border border-white/10 bg-black/20 text-white/75 hover:bg-white/10'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {active === 'General' && <GeneralSettingsPanel leagueId={leagueId} />}
      {active === 'Templates' && <LeagueTemplatesPanel leagueId={leagueId} />}
      {active === 'Privacy & invites' && <LeaguePrivacyAndInvitesPanel leagueId={leagueId} />}
      {active === 'Team Settings' && <TeamSettingsPanel />}
      {active === 'Roster Settings' && <RosterSettingsPanel />}
      {active === 'Scoring Settings' && <ScoringSettingsPanel />}
      {active === 'Dynasty Settings' && (
        <DynastySettingsPanel leagueId={leagueId} isCommissioner={!!isCommissioner} />
      )}
      {active === 'Draft Settings' && <DraftSettingsPanel leagueId={leagueId} />}
      {active === 'AI Settings' && <AISettingsPanel leagueId={leagueId} />}
      {active === 'Automation Settings' && <AutomationSettingsPanel leagueId={leagueId} />}
      {active === 'Waiver Settings' && <WaiverSettingsPanel leagueId={leagueId} />}
      {active === 'Playoff Settings' && <PlayoffSettingsPanel leagueId={leagueId} />}
      {active === 'Schedule Settings' && <ScheduleSettingsPanel leagueId={leagueId} />}
      {active === 'Division Settings' && <DivisionSettingsPanel />}
      {active === 'Member Settings' && <MemberSettingsPanel />}
      {active === 'Commissioner Controls' && <CommissionerControlsPanel leagueId={leagueId} />}
      {active === 'Behavior Profiles' && <BehaviorProfilesPanel leagueId={leagueId} />}
      {active === 'League Drama' && <LeagueDramaPanel leagueId={leagueId} />}
      {active === 'Reputation' && <ReputationPanel leagueId={leagueId} />}
      {active === 'GM Economy' && <GMEconomyPanel leagueId={leagueId} />}
      {active === 'Rules & Info' && <RulesInfoPanel />}
      {active === 'Previous Leagues' && <PreviousLeaguesPanel />}
      {active === 'Reset League' && <ResetLeaguePanel leagueId={leagueId} />}
      {active === 'Delete League' && <DeleteLeaguePanel />}
      {active === 'Devy Settings' && isDevyDynasty && (
        <DevySettingsPanel leagueId={leagueId} isCommissioner={!!isCommissioner} />
      )}
      {active === 'C2C Settings' && isMergedDevyC2C && (
        <MergedDevyC2CCommissionerSettings leagueId={leagueId} />
      )}
      {active === 'Big Brother Settings' && isBigBrother && (
        <BigBrotherSettingsPanel leagueId={leagueId} isCommissioner={!!isCommissioner} />
      )}
      {active === 'IDP Settings' && isIdp && (
        <IDPSettingsPanel leagueId={leagueId} isCommissioner={!!isCommissioner} />
      )}
    </section>
  )
}
