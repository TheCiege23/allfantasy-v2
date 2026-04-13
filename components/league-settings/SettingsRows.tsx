/**
 * components/league-settings/SettingsRows.tsx
 * Reusable row components for settings display/edit
 */

interface ReadOnlyRowProps {
  label: string;
  description?: string;
  value?: any;
  valueLabel?: string;
}

export function ReadOnlyRow({ label, description, value, valueLabel }: ReadOnlyRowProps) {
  const displayValue = valueLabel ?? (value !== undefined ? String(value) : '');
  
  return (
    <div className="py-3 border-b border-slate-700 flex justify-between items-center">
      <div className="flex-1">
        <p className="text-sm font-medium text-white">{label}</p>
        {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
      </div>
      <div className="text-right">
        <p className="text-sm text-slate-200">{displayValue}</p>
      </div>
    </div>
  );
}

interface EditableRowProps {
  label: string;
  description?: string;
  value: any;
  onChange: (value: any) => void;
  type?: 'text' | 'number' | 'checkbox' | 'select' | 'textarea';
  options?: Array<{ value: string; label: string }>;
  error?: string;
  required?: boolean;
  placeholder?: string;
}

export function EditableRow({
  label,
  description,
  value,
  onChange,
  type = 'text',
  options,
  error,
  required,
  placeholder,
}: EditableRowProps) {
  return (
    <div className={`py-4 border-b border-slate-700 ${error ? 'bg-red-950 bg-opacity-20' : ''}`}>
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium text-white">
            {label}
            {required && <span className="text-red-400 ml-1">*</span>}
          </label>
          {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
        </div>
        <div className="flex-1">
          {type === 'text' && (
            <input
              type="text"
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder={placeholder}
              aria-label={label}
              title={label}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
            />
          )}
          {type === 'number' && (
            <input
              type="number"
              value={value}
              onChange={e => onChange(parseInt(e.target.value) || 0)}
              aria-label={label}
              title={label}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
            />
          )}
          {type === 'checkbox' && (
            <input
              type="checkbox"
              checked={value}
              onChange={e => onChange(e.target.checked)}
              aria-label={label}
              title={label}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 cursor-pointer"
            />
          )}
          {type === 'select' && (
            <select
              value={value}
              onChange={e => onChange(e.target.value)}
              aria-label={label}
              title={label}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
            >
              {options?.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
          {type === 'textarea' && (
            <textarea
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder={placeholder}
              rows={4}
              aria-label={label}
              title={label}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
            />
          )}
          {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>
      </div>
    </div>
  );
}

interface PremiumLockedRowProps {
  label: string;
  description?: string;
  onUpgradeClick?: () => void;
}

export function PremiumLockedRow({ label, description, onUpgradeClick }: PremiumLockedRowProps) {
  return (
    <div className="py-4 border-b border-slate-700 bg-slate-800 bg-opacity-50 opacity-60">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
            <span className="text-yellow-400">🔒</span>
            {label}
          </label>
          {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
        </div>
        <button
          onClick={onUpgradeClick}
          className="px-3 py-1 text-xs font-medium bg-yellow-600 hover:bg-yellow-700 text-white rounded"
        >
          Upgrade
        </button>
      </div>
    </div>
  );
}
