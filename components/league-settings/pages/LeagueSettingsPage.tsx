/**
 * components/league-settings/pages/LeagueSettingsPage.tsx
 * Page for editing core league settings
 */

import type { UnifiedLeagueSettings, UserPermissions } from '@/lib/league-settings-engine/LeagueSettingsEngineTypes';
import { EditableRow, ReadOnlyRow } from '../SettingsRows';

interface LeagueSettingsPageProps {
  settings: UnifiedLeagueSettings;
  permissions: UserPermissions;
  onChange: (updated: Partial<UnifiedLeagueSettings>) => void;
}

export function LeagueSettingsPage({
  settings,
  permissions,
  onChange,
}: LeagueSettingsPageProps) {
  const isReadOnly = !permissions.isCommissioner;

  const handleLeagueChange = (field: string, value: any) => {
    onChange({
      league: {
        ...settings.league,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* League Info Section */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">League Information</h3>
        <div className="space-y-0">
          {isReadOnly ? (
            <>
              <ReadOnlyRow label="League Name" value={settings.league.name} />
              <ReadOnlyRow label="Description" value={settings.league.description || 'N/A'} />
              <ReadOnlyRow label="Season" value={settings.league.season} />
              <ReadOnlyRow label="Visibility" valueLabel={settings.league.visibility} />
              <ReadOnlyRow label="League Type" valueLabel={settings.meta.leagueType} />
            </>
          ) : (
            <>
              <EditableRow
                label="League Name"
                description="The name of your league"
                value={settings.league.name}
                onChange={v => handleLeagueChange('name', v)}
                required
              />
              <EditableRow
                label="Description"
                description="Optional description or tagline"
                value={settings.league.description || ''}
                onChange={v => handleLeagueChange('description', v)}
                type="textarea"
              />
              <EditableRow
                label="Season"
                description="Season year for this league"
                value={settings.league.season}
                onChange={v => handleLeagueChange('season', v)}
                type="number"
              />
              <EditableRow
                label="Visibility"
                description="Who can discover and join this league?"
                value={settings.league.visibility}
                onChange={v => handleLeagueChange('visibility', v)}
                type="select"
                options={[
                  { value: 'private', label: 'Private (invitation only)' },
                  { value: 'invited', label: 'Invited (via link)' },
                  { value: 'public', label: 'Public (anyone can find)' },
                ]}
              />
            </>
          )}
        </div>
      </div>

      {/* Playoff Settings Section */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Playoff Structure</h3>
        <div className="space-y-0">
          {isReadOnly ? (
            <>
              <ReadOnlyRow
                label="Playoffs Enabled"
                valueLabel={settings.league.playoffSettings.enabled ? 'Yes' : 'No'}
              />
              {settings.league.playoffSettings.enabled && (
                <>
                  <ReadOnlyRow
                    label="Playoff Teams"
                    value={settings.league.playoffSettings.numberOfPlayoffTeams}
                  />
                  <ReadOnlyRow
                    label="Playoff Start Week"
                    value={settings.league.playoffSettings.playoffStartWeek}
                  />
                  <ReadOnlyRow label="Format" valueLabel={settings.league.playoffSettings.format || 'N/A'} />
                </>
              )}
            </>
          ) : (
            <>
              <EditableRow
                label="Enable Playoffs"
                description="Use a playoff bracket to determine a champion"
                value={settings.league.playoffSettings.enabled}
                onChange={v => handleLeagueChange('playoffSettings', {...settings.league.playoffSettings, enabled: v})}
                type="checkbox"
              />
              {settings.league.playoffSettings.enabled && (
                <>
                  <EditableRow
                    label="Number of Playoff Teams"
                    value={settings.league.playoffSettings.numberOfPlayoffTeams}
                    onChange={v =>
                      handleLeagueChange('playoffSettings', {
                        ...settings.league.playoffSettings,
                        numberOfPlayoffTeams: v,
                      })
                    }
                    type="number"
                  />
                  <EditableRow
                    label="Playoff Start Week"
                    value={settings.league.playoffSettings.playoffStartWeek}
                    onChange={v =>
                      handleLeagueChange('playoffSettings', {
                        ...settings.league.playoffSettings,
                        playoffStartWeek: v,
                      })
                    }
                    type="number"
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Metadata (read-only) */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Metadata</h3>
        <div className="space-y-0">
          <ReadOnlyRow label="Sport" valueLabel={settings.meta.sport} />
          <ReadOnlyRow label="Timezone" valueLabel={settings.meta.timezone} />
          <ReadOnlyRow label="Source" valueLabel={settings.meta.sourceType === 'created' ? 'Created' : 'Imported'} />
        </div>
      </div>
    </div>
  );
}
