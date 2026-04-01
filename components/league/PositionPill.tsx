const PILL_STYLES: Record<string, string> = {
  QB: 'bg-[#3D1A3D] text-[#E84B7A]',
  RB: 'bg-[#0F3D25] text-[#3DD68C]',
  WR: 'bg-[#0F2A4A] text-[#3D9BE9]',
  TE: 'bg-[#3D2A0F] text-[#F5A623]',
  FLEX: 'bg-[#1E1A4A] text-[#7B61FF]',
  WRT: 'bg-[#1E1A4A] text-[#7B61FF]',
  SF: 'bg-[#1E1A4A] text-[#7B61FF]',
  K: 'bg-[#2A2A2A] text-[#9CA3AF]',
  DL: 'bg-[#1A2030] text-[#CBD5E1]',
  LB: 'bg-[#1A2030] text-[#CBD5E1]',
  DB: 'bg-[#1A2030] text-[#CBD5E1]',
  IDP: 'bg-[#1A2030] text-[#CBD5E1]',
  BN: 'bg-[#1A2030] text-[#94A3B8]',
  IR: 'bg-[#3D0F0F] text-[#F87171]',
  TX: 'bg-[#3D2A00] text-[#F59E0B]',
}

export default function PositionPill({
  label,
  className = '',
}: {
  label: string
  className?: string
}) {
  const upper = label.toUpperCase()
  const style = PILL_STYLES[upper] ?? 'bg-[#1A2030] text-[#CBD5E1]'

  return (
    <span
      className={`inline-flex min-w-[40px] items-center justify-center rounded-md px-2 py-1 text-[11px] font-semibold tracking-wide ${style} ${className}`}
    >
      {label}
    </span>
  )
}
