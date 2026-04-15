'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { CreateLeagueView } from '@/components/league-creation'
import type { WizardStepId } from '@/lib/league-creation-wizard/types'

const WIZARD_STEPS: WizardStepId[] = ['sport', 'team_setup', 'scoring', 'draft_privacy', 'review']
const WIZARD_STORAGE_KEY = 'af:create-league:wizard-state'

function parseWizardStep(raw: string | null | undefined): WizardStepId | null {
  if (!raw || typeof raw !== 'string') return null
  const v = raw.trim()
  return WIZARD_STEPS.includes(v as WizardStepId) ? (v as WizardStepId) : null
}

export interface CreateLeaguePageClientProps {
  userId: string
}

/**
 * Client UI for create league — auth is handled by the server `page.tsx` so we never
 * block on `useSession()` staying in the `loading` state.
 */
export function CreateLeaguePageClient({ userId }: CreateLeaguePageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialStep = parseWizardStep(searchParams?.get('step'))

  const clearWizardState = () => {
    if (typeof window === 'undefined') return
    window.sessionStorage.removeItem(WIZARD_STORAGE_KEY)
  }

  /** Match wizard: step comes from URL when present; otherwise step 1 (do not use sessionStorage for step). */
  const resolveCurrentStep = (): WizardStepId => initialStep ?? 'sport'

  const pushWizardStep = (step: WizardStepId) => {
    const nextParams = new URLSearchParams(searchParams?.toString() ?? '')
    nextParams.set('step', step)
    nextParams.delete('returnTo')
    router.push(`/create-league?${nextParams.toString()}`, { scroll: false })
  }

  const handleBack = () => {
    const currentStep = resolveCurrentStep()
    const currentStepIndex = WIZARD_STEPS.indexOf(currentStep)
    if (currentStepIndex > 0) {
      pushWizardStep(WIZARD_STEPS[currentStepIndex - 1]!)
      return
    }
    clearWizardState()
    router.push('/dashboard')
  }

  const handleHome = () => {
    clearWizardState()
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#02061a] bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(20,40,100,0.55),rgba(1,4,20,0.96))] text-white">
      <header className="px-4 pb-2 pt-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/20 text-lg text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Back to app"
          >
            ←
          </button>
          <h1 className="text-base font-semibold tracking-tight text-white/90 sm:text-lg">New league</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push('/import?returnTo=%2Fcreate-league')}
              className="inline-flex h-9 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-500/10 px-3 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/20"
              aria-label="Open import page"
            >
              Import
            </button>
            <button
              type="button"
              onClick={handleHome}
              className="inline-flex h-9 items-center justify-center rounded-full border border-white/20 bg-black/20 px-3 text-xs font-semibold text-white/90 hover:bg-white/10"
              aria-label="Go to dashboard home"
            >
              Home
            </button>
          </div>
        </div>
      </header>
      <CreateLeagueView userId={userId} initialStep={initialStep} />
    </div>
  )
}
