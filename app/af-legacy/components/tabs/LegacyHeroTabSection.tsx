'use client'

import type { ReactNode } from 'react'

type Props = {
  metric: ReactNode
  children: ReactNode
}

export default function LegacyHeroTabSection({ metric, children }: Props) {
  return (
    <>
      {metric}
      {children}
    </>
  )
}
