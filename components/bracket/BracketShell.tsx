'use client'

import type { ReactNode } from 'react'

export default function BracketShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6 sm:px-6">
      {children}
    </div>
  )
}
