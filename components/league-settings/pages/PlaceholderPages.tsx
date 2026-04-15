/**
 * components/league-settings/pages/PlaceholderPages.tsx
 * Placeholder page components for remaining settings pages
 * These can be refined later with sport-specific logic
 */

import type { UnifiedLeagueSettings, UserPermissions } from '@/lib/league-settings-engine/LeagueSettingsEngineTypes';
import { ReadOnlyRow, EditableRow } from '../SettingsRows';

interface PageProps {
  settings: UnifiedLeagueSettings;
  permissions: UserPermissions;
  onChange: (updated: Partial<UnifiedLeagueSettings>) => void;
}

export function RosterSettingsPage({ settings, permissions }: PageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Roster Configuration</h3>
        <div className="text-slate-300 text-sm">
          <p>Roster template: <span className="font-mono bg-slate-800 px-2 py-1 rounded">{settings.roster.templateKey}</span></p>
          <p className="mt-2">Roster editing is managed through the dedicated Roster Settings module.</p>
          <p className="text-slate-400 mt-4">Current roster version: {settings.roster.version}</p>
          <p className="text-slate-400">Matches template: {settings.roster.matchesTemplate ? 'Yes ✓' : 'No ✗'}</p>
        </div>
      </div>
    </div>
  );
}

export function ScoringSettingsPage({ settings, permissions }: PageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Scoring Configuration</h3>
        <div className="text-slate-300 text-sm">
          <p>Scoring preset: <span className="font-mono bg-slate-800 px-2 py-1 rounded">{settings.scoring.presetKey}</span></p>
          <p className="mt-2">Scoring settings are managed through the dedicated Scoring Settings module.</p>
          <p className="text-slate-400 mt-4">Current scoring version: {settings.scoring.version}</p>
        </div>
      </div>
    </div>
  );
}

export function DivisionSettingsPage({ settings, permissions, onChange }: PageProps) {
  const isReadOnly = !permissions.isCommissioner;

  const handleDivisionsChange = (field: string, value: any) => {
    onChange({
      divisions: {
        ...settings.divisions,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Division Settings</h3>
        <div className="space-y-0">
          {isReadOnly ? (
            <>
              <ReadOnlyRow
                label="Divisions Enabled"
                valueLabel={settings.divisions.enabled ? 'Yes' : 'No'}
              />
              {settings.divisions.enabled && (
                <ReadOnlyRow label="Number of Divisions" value={settings.divisions.numberOfDivisions} />
              )}
            </>
          ) : (
            <>
              <EditableRow
                label="Enable Divisions"
                description="Split the league into divisions"
                value={settings.divisions.enabled}
                onChange={v => handleDivisionsChange('enabled', v)}
                type="checkbox"
              />
              {settings.divisions.enabled && (
                <EditableRow
                  label="Number of Divisions"
                  value={settings.divisions.numberOfDivisions || 2}
                  onChange={v => handleDivisionsChange('numberOfDivisions', v)}
                  type="number"
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function MemberSettingsPage({ settings, permissions }: PageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Member Management</h3>
        <div className="text-slate-300 text-sm">
          <p className="mb-3">Manage league member invitations, approvals, and permissions.</p>
          <ul className="list-disc list-inside space-y-1 text-slate-400">
            <li>Invite new members</li>
            <li>Configure approval workflow</li>
            <li>Set visibility rules</li>
            <li>Handle inactive managers</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export function CoOwnerSettingsPage({ settings, permissions }: PageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Co-owner Settings</h3>
        <div className="text-slate-300 text-sm">
          <p className="mb-3">Allow team owners to add co-managers to their teams.</p>
          <p className="text-slate-400 mt-2">Co-owner enabled: {settings.coOwners.coOwnerEnabled ? 'Yes ✓' : 'No ✗'}</p>
          {settings.coOwners.coOwnerEnabled && (
            <p className="text-slate-400 mt-1">Permission scope: {settings.coOwners.coOwnerPermissionScope}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function CommissionerControlPage({ settings, permissions }: PageProps) {
  if (!permissions.isCommissioner) {
    return (
      <div className="bg-red-900 bg-opacity-20 border border-red-700 rounded p-6">
        <p className="text-red-300">This page is only available to the league commissioner.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Commissioner Tools</h3>
        <div className="text-slate-300 text-sm space-y-2">
          <p>✓ Force lineup set/unset</p>
          <p>✓ Lock/unlock waivers</p>
          <p>✓ Emergency tools</p>
          <p>✓ Audit log access</p>
          <p className="text-slate-400 text-xs mt-4">Premium commissioner tools are available with subscription.</p>
        </div>
      </div>
    </div>
  );
}

export function PreviousLeaguesPage({ settings, permissions }: PageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Previous Leagues</h3>
        <div className="text-slate-300 text-sm">
          <p className="mb-3">Archive and access previous seasons of this league.</p>
          <p className="text-slate-400 mt-2">No previous leagues yet.</p>
        </div>
      </div>
    </div>
  );
}

export function DeleteLeaguePage({ settings, permissions, onChange }: PageProps) {
  if (!permissions.isCommissioner) {
    return (
      <div className="bg-red-900 bg-opacity-20 border border-red-700 rounded p-6">
        <p className="text-red-300">Only the commissioner can delete a league.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-red-900 bg-opacity-20 border border-red-700 rounded p-6">
        <h3 className="text-lg font-semibold text-red-300 mb-2">Danger Zone</h3>
        <p className="text-red-200 text-sm mb-4">
          Deleting a league is permanent and cannot be undone. All league data will be archived.
        </p>
        <button className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-sm font-medium rounded">
          Delete League
        </button>
      </div>
    </div>
  );
}
