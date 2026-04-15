import { ReactNode } from 'react'

export function RosterSettingsModalShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-[#0f1318] p-4 md:p-5">
      <div>
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <p className="mt-0.5 text-xs text-white/50">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}
