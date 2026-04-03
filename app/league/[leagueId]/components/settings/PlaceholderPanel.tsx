'use client'

export function PlaceholderPanel({ title }: { title: string }) {
  return (
    <div className="px-6 py-10 text-[13px] text-white/45">
      <p className="font-medium text-white/70">{title}</p>
      <p className="mt-2">This section is not wired yet.</p>
    </div>
  )
}
