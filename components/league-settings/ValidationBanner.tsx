/**
 * components/league-settings/ValidationBanner.tsx
 * Display validation errors and warnings
 */

import { LeagueSettingsValidationError } from '@/lib/league-settings-engine';

interface ValidationBannerProps {
  errors: LeagueSettingsValidationError[];
  warnings: LeagueSettingsValidationError[];
  canSave: boolean;
}

export function ValidationBanner({ errors, warnings, canSave }: ValidationBannerProps) {
  if (errors.length === 0 && warnings.length === 0) {
    return null;
  }

  const hasErrors = errors.length > 0;
  const bgColor = hasErrors ? 'bg-red-900 border-red-700' : 'bg-amber-900 border-amber-700';
  const headerColor = hasErrors ? 'text-red-100' : 'text-amber-100';
  const listItemColor = hasErrors ? 'text-red-50' : 'text-amber-50';

  return (
    <div className={`border-l-4 ${bgColor} p-4 rounded mb-4`}>
      <h3 className={`${headerColor} font-semibold text-sm mb-2`}>
        {hasErrors ? 'Errors' : 'Warnings'}
      </h3>
      <ul className={`${listItemColor} text-sm space-y-1`}>
        {errors.map((err, idx) => (
          <li key={`err-${idx}`} className="flex gap-2">
            <span className="mt-0.5">•</span>
            <span>{err.message}</span>
          </li>
        ))}
        {warnings.map((warn, idx) => (
          <li key={`warn-${idx}`} className="flex gap-2">
            <span className="mt-0.5">•</span>
            <span>{warn.message}</span>
          </li>
        ))}
      </ul>
      {!canSave && (
        <p className="text-red-100 text-xs mt-2 font-medium">Fix errors before saving.</p>
      )}
    </div>
  );
}
