import type { ReactNode } from "react"

export default function AuthShell({ children }: { children: ReactNode }) {
  return <div className="relative min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4 py-8">{children}</div>
}
