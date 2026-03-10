'use client'

import type { ComponentProps } from 'react'
import TradeFinderV2 from '@/components/TradeFinderV2'

export default function LegacyFinderTab(props: ComponentProps<typeof TradeFinderV2>) {
  return <TradeFinderV2 {...props} />
}
