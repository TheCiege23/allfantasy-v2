import type { ReactNode } from "react"

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[#07071a]">{children}</div>
}
