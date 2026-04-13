'use client'

import React from 'react'
import { ArrowRight } from 'lucide-react'

export interface ChimmyAlertActionButtonProps {
  label: string
  onClick?: () => void
  href?: string
  className?: string
}

export default function ChimmyAlertActionButton({ label, onClick, href, className = '' }: ChimmyAlertActionButtonProps) {
  if (href) {
    return (
      <a
        href={href}
        className={`inline-flex items-center gap-1 rounded-md border border-cyan-300/40 bg-cyan-500/20 px-3 py-1.5 text-[11px] font-semibold text-cyan-100 transition hover:bg-cyan-500/30 ${className}`}
      >
        {label}
        <ArrowRight className="h-3 w-3" />
      </a>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-md border border-cyan-300/40 bg-cyan-500/20 px-3 py-1.5 text-[11px] font-semibold text-cyan-100 transition hover:bg-cyan-500/30 ${className}`}
    >
      {label}
      <ArrowRight className="h-3 w-3" />
    </button>
  )
}
