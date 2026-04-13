'use client'

import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { Sparkles } from 'lucide-react'

export interface ChimmyModalDeepDiveProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}

export default function ChimmyModalDeepDive({
  open,
  onClose,
  title,
  subtitle,
  children,
  className = '',
}: ChimmyModalDeepDiveProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`fixed inset-4 sm:inset-8 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl z-50 flex flex-col rounded-2xl border border-white/10 bg-slate-900 overflow-hidden ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chimmy-modal-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-indigo-400" />
            <div>
              <p id="chimmy-modal-title" className="text-base font-semibold text-white">{title}</p>
              {subtitle && <p className="mt-0.5 text-sm text-white/50">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-white/10 transition-colors ml-2 shrink-0"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-white/60" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </>
  )
}
