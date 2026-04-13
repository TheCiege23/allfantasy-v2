/**
 * components/league-settings/LeagueSettingsModalShell.tsx
 * Main modal container and orchestrator for all league settings pages
 */

'use client';

import { useState, useEffect } from 'react';
import type { LeagueSettingsPage, UnifiedLeagueSettings, UserPermissions } from '@/lib/league-settings-engine/LeagueSettingsEngineTypes';
import { LeagueSettingsPermissionsService } from '@/lib/league-settings-engine/LeagueSettingsPermissionsService';
import { SettingsSidebarNav } from './SettingsSidebarNav';
import { SaveBar } from './SaveBar';
import { ValidationBanner } from './ValidationBanner';
import { SettingsPageRouter } from './SettingsPageRouter';

interface LeagueSettingsModalShellProps {
  leagueId: string;
  onClose: () => void;
  initialPage?: LeagueSettingsPage;
}

export function LeagueSettingsModalShell({
  leagueId,
  onClose,
  initialPage = 'league',
}: LeagueSettingsModalShellProps) {
  const [currentPage, setCurrentPage] = useState<LeagueSettingsPage>(initialPage);
  const [settings, setSettings] = useState<UnifiedLeagueSettings | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<any[]>([]);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, [leagueId]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/commissioner/leagues/${leagueId}/league-settings`);

      if (!response.ok) {
        throw new Error('Failed to load league settings');
      }

      const data = await response.json();
      setSettings(data.settings);
      setUserPermissions(data.userPermissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings || !userPermissions) return;

    try {
      setIsSaving(true);
      const response = await fetch(`/api/commissioner/leagues/${leagueId}/league-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: currentPage,
          data: settings,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to save settings');
      }

      const data = await response.json();
      setSettings(data.settings);
      setIsDirty(false);
      setValidationErrors([]);
      setValidationWarnings([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsDirty(false);
    fetchSettings();
  };

  const visiblePages = userPermissions 
    ? LeagueSettingsPermissionsService.getVisiblePages(userPermissions)
    : [];

  if (loading || !settings || !userPermissions) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-slate-900 rounded-lg p-8 text-center">
          <p className="text-white">{loading ? 'Loading...' : error || 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        {/* Modal container */}
        <div className="bg-slate-900 rounded-lg shadow-2xl flex flex-col w-11/12 h-5/6 max-w-6xl overflow-hidden">
          {/* Header */}
          <div className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">League Settings</h1>
              <p className="text-sm text-slate-400 mt-1">Manage all league configurations in one place</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-2xl font-light"
            >
              ✕
            </button>
          </div>

          {/* Main content area */}
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <SettingsSidebarNav
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              visiblePages={visiblePages}
              isCommissioner={userPermissions.isCommissioner}
            />

            {/* Content area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {error && (
                <div className="bg-red-900 bg-opacity-20 border-b border-red-700 px-6 py-3">
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              )}

              <div className="flex-1 overflow-y-auto px-6 py-6 pb-32">
                {/* Validation banner */}
                <ValidationBanner errors={validationErrors} warnings={validationWarnings} canSave={true} />

                {/* Page content */}
                <SettingsPageRouter
                  page={currentPage}
                  settings={settings}
                  permissions={userPermissions}
                  onChange={(updates) => {
                    setSettings({ ...settings, ...updates });
                    setIsDirty(true);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save bar (fixed at bottom) */}
      <SaveBar
        isDirty={isDirty}
        isSaving={isSaving}
        onSave={handleSave}
        onCancel={handleCancel}
        validationStatus={validationErrors.length > 0 ? 'error' : validationWarnings.length > 0 ? 'warning' : 'valid'}
      />
    </>
  );
}
