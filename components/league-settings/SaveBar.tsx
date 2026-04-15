/**
 * components/league-settings/SaveBar.tsx
 * Sticky save/cancel bar at bottom of settings modal
 */

import { useState } from 'react';

interface SaveBarProps {
  isDirty: boolean;
  isSaving: boolean;
  validationStatus?: 'valid' | 'warning' | 'error';
  onSave: () => Promise<void>;
  onCancel: () => void;
}

export function SaveBar({ isDirty, isSaving, validationStatus = 'valid', onSave, onCancel }: SaveBarProps) {
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    try {
      await onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    }
  };

  if (!isDirty) {
    return null;
  }

  const bgColor = validationStatus === 'error' ? 'bg-red-900' : validationStatus === 'warning' ? 'bg-amber-900' : 'bg-slate-800';
  const borderColor = validationStatus === 'error' ? 'border-red-700' : validationStatus === 'warning' ? 'border-amber-700' : 'border-slate-700';

  return (
    <div className={`fixed bottom-0 left-0 right-0 ${bgColor} border-t ${borderColor} px-6 py-4`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          {error && <p className="text-red-300 text-sm">{error}</p>}
          {!error && validationStatus === 'warning' && (
            <p className="text-amber-300 text-sm">Settings have warnings. Review before saving.</p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded text-white text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-4 py-2 rounded text-white text-sm font-medium disabled:opacity-50 ${
              validationStatus === 'error' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
