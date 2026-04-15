/**
 * components/league-settings/SettingsSidebarNav.tsx
 * Left navigation sidebar for settings modal
 */

import type { LeagueSettingsPage } from '@/lib/league-settings-engine/LeagueSettingsEngineTypes';

interface SettingsSidebarNavProps {
  currentPage: LeagueSettingsPage;
  onPageChange: (page: LeagueSettingsPage) => void;
  visiblePages: LeagueSettingsPage[];
  isCommissioner: boolean;
}

const PAGE_LABELS: Record<LeagueSettingsPage, { label: string; icon: string; commissionerOnly?: boolean }> = {
  league: { label: 'League Settings', icon: '⚙️' },
  team: { label: 'Team Settings', icon: '👥' },
  roster: { label: 'Roster Settings', icon: '📋' },
  scoring: { label: 'Scoring', icon: '📊' },
  draft: { label: 'Draft', icon: '🏆' },
  divisions: { label: 'Divisions', icon: '🗂️' },
  members: { label: 'Members', icon: '👤' },
  'co-owners': { label: 'Co-owners', icon: '🤝' },
  'commissioner-control': { label: 'Commissioner Tools', icon: '🔧', commissionerOnly: true },
  'previous-leagues': { label: 'Previous Leagues', icon: '📚' },
  'delete-league': { label: 'Delete League', icon: '🗑️', commissionerOnly: true },
};

export function SettingsSidebarNav({
  currentPage,
  onPageChange,
  visiblePages,
  isCommissioner,
}: SettingsSidebarNavProps) {
  return (
    <nav className="w-52 bg-slate-900 border-r border-slate-700 overflow-y-auto flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-bold text-white">Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {visiblePages.map(page => {
          const pageInfo = PAGE_LABELS[page];
          const isActive = currentPage === page;

          if (pageInfo.commissionerOnly && !isCommissioner) {
            return null;
          }

          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`w-full text-left px-4 py-3 border-l-2 transition-colors text-sm font-medium flex items-center gap-2 ${
                isActive
                  ? 'bg-blue-900 bg-opacity-30 border-l-blue-500 text-blue-300'
                  : 'border-l-transparent text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span className="text-base">{pageInfo.icon}</span>
              {pageInfo.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
