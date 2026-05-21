"use client"

import type { ReactNode } from "react"

export function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <div
      data-auth-page-shell="true"
      className="min-h-screen bg-slate-950 text-white"
    >
      {children}
    </div>
  )
}
