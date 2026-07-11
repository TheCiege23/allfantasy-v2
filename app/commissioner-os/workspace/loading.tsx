import { CommissionerPageContainer } from '@/components/commissioner-os/shell/CommissionerPageContainer'
import { LoadingState } from '@/components/commissioner-os/states'

/** Next.js's route-level Suspense fallback — shown while the Server Component above awaits the adapter. A real async boundary, not a fabricated client-side spinner. */
export default function WorkspaceLoading() {
  return (
    <CommissionerPageContainer>
      <LoadingState rows={5} />
    </CommissionerPageContainer>
  )
}
