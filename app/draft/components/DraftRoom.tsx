'use client'

import type { ComponentProps } from 'react'
import { DraftShell } from './DraftShell'

/**
 * Full-viewport draft chrome (no AppShell / league sidebars).
 * Uses the existing draft engine (`DraftShell` + `draftRoomStateRow`).
 */
export function DraftRoom(props: ComponentProps<typeof DraftShell>) {
  return (
    <div className="fixed inset-0 z-[100] flex h-full min-h-0 flex-col bg-[#0d1117] text-[#e6edf3]">
      <DraftShell {...props} />
    </div>
  )
}
