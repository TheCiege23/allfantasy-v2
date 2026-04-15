/**
 * components/league-settings/SettingsPageRouter.tsx
 * Routes current page state to appropriate page component
 */

import type { UnifiedLeagueSettings, UserPermissions, LeagueSettingsPage } from '@/lib/league-settings-engine/LeagueSettingsEngineTypes';
import { LeagueSettingsPage as LeagueSettingsPageComponent } from './pages/LeagueSettingsPage';
import { TeamSettingsPage } from './pages/TeamSettingsPage';
import { DraftSettingsPage } from './pages/DraftSettingsPage';
import {
  RosterSettingsPage,
  ScoringSettingsPage,
  DivisionSettingsPage,
  MemberSettingsPage,
  CoOwnerSettingsPage,
  CommissionerControlPage,
  PreviousLeaguesPage,
  DeleteLeaguePage,
} from './pages/PlaceholderPages';

interface SettingsPageRouterProps {
  page: LeagueSettingsPage;
  settings: UnifiedLeagueSettings;
  permissions: UserPermissions;
  onChange: (updated: Partial<UnifiedLeagueSettings>) => void;
}

export function SettingsPageRouter({ page, settings, permissions, onChange }: SettingsPageRouterProps) {
  // Prevent non-commissioners from viewing commissioner-only pages
  if ((page === 'commissioner-control' || page === 'delete-league') && !permissions.isCommissioner) {
    return (
      <div className="bg-red-900 bg-opacity-20 border border-red-700 rounded p-8 text-center">
        <h2 className="text-xl font-semibold text-red-300 mb-2">Access Denied</h2>
        <p className="text-red-200">
          {page === 'commissioner-control'
            ? 'Commissioner tools are only available to the league commissioner.'
            : 'Only the commissioner can delete a league.'}
        </p>
      </div>
    );
  }

  // Route to correct page component based on page name
  switch (page) {
    case 'league':
      return <LeagueSettingsPageComponent settings={settings} permissions={permissions} onChange={onChange} />;
    case 'team':
      return <TeamSettingsPage settings={settings} permissions={permissions} onChange={onChange} />;
    case 'draft':
      return <DraftSettingsPage settings={settings} permissions={permissions} onChange={onChange} />;
    case 'roster':
      return <RosterSettingsPage settings={settings} permissions={permissions} onChange={onChange} />;
    case 'scoring':
      return <ScoringSettingsPage settings={settings} permissions={permissions} onChange={onChange} />;
    case 'divisions':
      return <DivisionSettingsPage settings={settings} permissions={permissions} onChange={onChange} />;
    case 'members':
      return <MemberSettingsPage settings={settings} permissions={permissions} onChange={onChange} />;
    case 'co-owners':
      return <CoOwnerSettingsPage settings={settings} permissions={permissions} onChange={onChange} />;
    case 'commissioner-control':
      return <CommissionerControlPage settings={settings} permissions={permissions} onChange={onChange} />;
    case 'previous-leagues':
      return <PreviousLeaguesPage settings={settings} permissions={permissions} onChange={onChange} />;
    case 'delete-league':
      return <DeleteLeaguePage settings={settings} permissions={permissions} onChange={onChange} />;

    default:
      return (
        <div className="text-center text-slate-400 py-12">
          <p className="font-mono text-sm">Unknown page: {page}</p>
        </div>
      );
  }
}
