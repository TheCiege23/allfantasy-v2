'use client'

type Props = {
  enabled: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}

export function AutopickToggle({ enabled, onChange, disabled }: Props) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[11px] text-white/70">
      <input
        type="checkbox"
        checked={enabled}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-white/20 bg-transparent"
      />
      Autopick
    </label>
  )
}
