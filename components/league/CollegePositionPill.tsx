const COLLEGE_PILL_STYLES: Record<string, string> = {
  QB: 'bg-[#1f315f] text-[#99c2ff]',
  RB: 'bg-[#173821] text-[#7be49d]',
  WR: 'bg-[#18364f] text-[#77c9ff]',
  TE: 'bg-[#4f3318] text-[#ffc274]',
  K: 'bg-[#3a3f52] text-[#d6dbea]',
  OL: 'bg-[#2d3548] text-[#cfd8ea]',
  DL: 'bg-[#342641] text-[#d5b5ff]',
  LB: 'bg-[#2b3241] text-[#c7d5ef]',
  DB: 'bg-[#2a2f46] text-[#aebef5]',
  PG: 'bg-[#182f58] text-[#8ec5ff]',
  SG: 'bg-[#20344f] text-[#9fd4ff]',
  SF: 'bg-[#234b36] text-[#85efac]',
  PF: 'bg-[#4d351e] text-[#ffc389]',
  C: 'bg-[#4a2828] text-[#ffaaaa]',
  G: 'bg-[#233b62] text-[#9dc8ff]',
  F: 'bg-[#274933] text-[#95f0b4]',
  UTIL: 'bg-[#3b2c5d] text-[#d0bbff]',
  COLLEGE: 'bg-[#1d2740] text-[#c5d8ff]',
}

export default function CollegePositionPill({
  label,
  className = '',
}: {
  label: string
  className?: string
}) {
  const upper = label.toUpperCase()
  const style = COLLEGE_PILL_STYLES[upper] ?? 'bg-[#1d2740] text-[#c5d8ff]'

  return (
    <span className={`inline-flex min-w-[52px] items-center justify-center rounded-md px-2 py-1 text-[11px] font-semibold tracking-wide ${style} ${className}`}>
      {label}
    </span>
  )
}
