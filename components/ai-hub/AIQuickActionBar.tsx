'use client'

import React from 'react'
import Link from 'next/link'
import { MessageCircle, ArrowLeftRight, ClipboardList, Target, Zap } from 'lucide-react'
import { AIProductLayer } from '@/lib/ai-product-layer'

const QUICK_ACTIONS = [
  {
    id: 'ask-chimmy',
    label: 'Ask Chimmy',
    href: () => AIProductLayer.chimmy.getChatHref({ source: 'quick_action' }),
    icon: MessageCircle,
  },
  {
    id: 'compare-trade',
    label: 'Compare Trade',
    href: () => AIProductLayer.routes.getHrefForFeature('trade_analyzer', { source: 'quick_action' }),
    icon: ArrowLeftRight,
  },
  {
    id: 'waiver-targets',
    label: 'Find Waiver Targets',
    href: () => AIProductLayer.routes.getHrefForFeature('waiver_ai', { source: 'quick_action' }),
    icon: ClipboardList,
  },
  {
    id: 'draft-advice',
    label: 'Draft Advice',
    href: () => AIProductLayer.routes.getHrefForFeature('draft_helper', { source: 'quick_action' }),
    icon: Target,
  },
  {
    id: 'explain-matchup',
    label: 'Explain Matchup',
    href: () => AIProductLayer.chimmy.getChatHrefWithPrompt('Explain my matchup', { source: 'quick_action', insightType: 'matchup' }),
    icon: Zap,
  },
]

export interface AIQuickActionBarProps {
  className?: string
}

/**
 * Quick action links: Ask Chimmy, Compare Trade, Find Waiver Targets, Draft Advice, Explain Matchup.
 * Every item is a real Link with href (no dead buttons).
 */
export default function AIQuickActionBar({ className = '' }: AIQuickActionBarProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-xs font-medium text-white/50">Quick actions</span>
      {QUICK_ACTIONS.map((action) => {
        const Icon = action.icon
        const href = action.href()
        return (
          <Link
            key={action.id}
            href={href}
            data-quick-action={action.id}
            data-testid={`ai-quick-action-${action.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
          >
            <Icon className="h-3.5 w-3.5" />
            {action.label}
          </Link>
        )
      })}
    </div>
  )
}
