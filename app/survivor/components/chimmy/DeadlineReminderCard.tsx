import Link from 'next/link'

export function DeadlineReminderCard({
  label,
  href,
}: {
  label: string
  href: string
}) {
  return (
    <div className="rounded-xl border border-orange-500/35 bg-orange-500/10 p-3">
      <p className="font-mono text-[13px] tabular-nums text-orange-100">⏱ {label}</p>
      <Link
        href={href}
        className="mt-2 inline-flex min-h-[44px] items-center text-[12px] font-semibold text-orange-200 underline"
      >
        Cast vote now
      </Link>
    </div>
  )
}
