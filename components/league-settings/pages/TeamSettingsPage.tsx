/**
 * components/league-settings/pages/TeamSettingsPage.tsx
 * Page for managing team-level settings
 */

import type { UnifiedLeagueSettings, UserPermissions } from '@/lib/league-settings-engine/LeagueSettingsEngineTypes';
import { EditableRow, ReadOnlyRow } from '../SettingsRows';

interface TeamSettingsPageProps {
  settings: UnifiedLeagueSettings;
  permissions: UserPermissions;
  onChange: (updated: Partial<UnifiedLeagueSettings>) => void;
}

export function TeamSettingsPage({ settings, permissions, onChange }: TeamSettingsPageProps) {
  const isReadOnly = !permissions.isCommissioner;

  const handleTeamChange = (field: string, value: any) => {
    onChange({
      team: {
        ...settings.team,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Team Configuration</h3>
        <div className="space-y-0">
          {isReadOnly ? (
            <>
              <ReadOnlyRow label="Number of Teams" value={settings.team.numberOfTeams} />
              <ReadOnlyRow label="Team Naming Rules" valueLabel={settings.team.teamNamingRules || 'Free'} />
              <ReadOnlyRow
                label="Orphan Team Handling"
                valueLabel={settings.team.orphanTeamHandling || 'Commissioner assigns'}
              />
            </>
          ) : (
            <>
              <EditableRow
                label="Number of Teams"
                description="Total number of teams in the league"
                value={settings.team.numberOfTeams}
                onChange={v => handleTeamChange('numberOfTeams', v)}
                type="number"
                required
              />
              <EditableRow
                label="Team Naming Rules"
                description="Restrictions on team naming"
                value={settings.team.teamNamingRules || 'free'}
                onChange={v => handleTeamChange('teamNamingRules', v)}
                type="select"
                options={[
                  { value: 'free', label: 'Free (any name)' },
                  { value: 'enforced-name-only', label: 'Name only (no special chars)' },
                  { value: 'avatar-required', label: 'Avatar required' },
                ]}
              />
              <EditableRow
                label="Orphan Team Handling"
                description="What happens to orphaned (unowned) teams?"
                value={settings.team.orphanTeamHandling || 'commissioner-assigns'}
                onChange={v => handleTeamChange('orphanTeamHandling', v)}
                type="select"
                options={[
                  { value: 'auto-disband', label: 'Auto-disband' },
                  { value: 'commissioner-assigns', label: 'Commissioner assigns' },
                  { value: 'keep', label: 'Keep as-is' },
                ]}
              />
            </>
          )}
        </div>
      </div>

      {settings.meta.leagueType === 'dynasty' && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Franchise Settings</h3>
          <div className="space-y-0">
            {isReadOnly ? (
              <ReadOnlyRow
                label="Franchise Continuity"
                valueLabel={settings.team.franchiseContinuity?.enabled ? 'Enabled' : 'Disabled'}
              />
            ) : (
              <EditableRow
                label="Enable Franchise Continuity"
                description="Franchises carry forward from season to season"
                value={settings.team.franchiseContinuity?.enabled || false}
                onChange={v =>
                  handleTeamChange('franchiseContinuity', {
                    ...settings.team.franchiseContinuity,
                    enabled: v,
                  })
                }
                type="checkbox"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
