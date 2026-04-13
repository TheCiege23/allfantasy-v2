/**
 * components/league-settings/pages/DraftSettingsPage.tsx
 * Page for draft configuration
 */

import type { UnifiedLeagueSettings, UserPermissions } from '@/lib/league-settings-engine/LeagueSettingsEngineTypes';
import { EditableRow, ReadOnlyRow } from '../SettingsRows';

interface DraftSettingsPageProps {
  settings: UnifiedLeagueSettings;
  permissions: UserPermissions;
  onChange: (updated: Partial<UnifiedLeagueSettings>) => void;
}

export function DraftSettingsPage({ settings, permissions, onChange }: DraftSettingsPageProps) {
  const isReadOnly = !permissions.isCommissioner;

  const handleDraftChange = (field: string, value: any) => {
    onChange({
      draft: {
        ...settings.draft,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Draft Format</h3>
        <div className="space-y-0">
          {isReadOnly ? (
            <>
              <ReadOnlyRow label="Draft Type" valueLabel={settings.draft.draftType} />
              <ReadOnlyRow label="Draft Order" valueLabel={settings.draft.draftOrder} />
              <ReadOnlyRow label="Snake Direction" valueLabel={settings.draft.snakeDirection || 'Linear'} />
            </>
          ) : (
            <>
              <EditableRow
                label="Draft Type"
                description="Format for selecting players"
                value={settings.draft.draftType}
                onChange={v => handleDraftChange('draftType', v)}
                type="select"
                required
                options={[
                  { value: 'snake', label: 'Snake' },
                  { value: 'linear', label: 'Linear' },
                  { value: 'auction', label: 'Auction' },
                ]}
              />
              <EditableRow
                label="Draft Order"
                description="How are draft positions determined?"
                value={settings.draft.draftOrder}
                onChange={v => handleDraftChange('draftOrder', v)}
                type="select"
                options={[
                  { value: 'randomized', label: 'Randomized' },
                  { value: 'manual', label: 'Manual' },
                  { value: 'serpentine', label: 'Serpentine' },
                ]}
              />
            </>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Draft Settings</h3>
        <div className="space-y-0">
          {isReadOnly ? (
            <>
              <ReadOnlyRow
                label="Timer Enabled"
                valueLabel={settings.draft.timerEnabled ? 'Yes' : 'No'}
              />
              {settings.draft.timerEnabled && (
                <ReadOnlyRow label="Timer Duration" value={`${settings.draft.timerSeconds}s`} />
              )}
            </>
          ) : (
            <>
              <EditableRow
                label="Enable Draft Timer"
                description="Use a countdown timer for each pick"
                value={settings.draft.timerEnabled}
                onChange={v => handleDraftChange('timerEnabled', v)}
                type="checkbox"
              />
              {settings.draft.timerEnabled && (
                <EditableRow
                  label="Timer Duration (seconds)"
                  value={settings.draft.timerSeconds || 120}
                  onChange={v => handleDraftChange('timerSeconds', v)}
                  type="number"
                />
              )}
              <EditableRow
                label="Allow Pause/Resume"
                description="Managers can pause and resume the draft"
                value={settings.draft.pauseResumeAllowed || false}
                onChange={v => handleDraftChange('pauseResumeAllowed', v)}
                type="checkbox"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
