import { Suspense } from 'react'
import dynamicImport from 'next/dynamic'

export const dynamic = 'force-dynamic'

const WorldCupIntroExperience = dynamicImport(
  () => import('@/components/world-cup/WorldCupIntroExperience'),
  { ssr: false }
)

export default function WorldCupIntroPage() {
  return (
    <Suspense>
      <WorldCupIntroExperience />
    </Suspense>
  )
}
