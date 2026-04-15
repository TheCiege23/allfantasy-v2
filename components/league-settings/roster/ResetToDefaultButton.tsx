export function ResetToDefaultButton({
  onClick,
  disabled,
}: {
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/60 hover:bg-white/10 disabled:cursor-default disabled:opacity-40"
    >
      Reset
    </button>
  )
}
