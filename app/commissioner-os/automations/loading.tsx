import { CommissionerPageContainer } from '@/components/commissioner-os/shell/CommissionerPageContainer'
import { LoadingState } from '@/components/commissioner-os/states'

export default function AutomationCenterLoading() {
  return (
    <CommissionerPageContainer>
      <LoadingState rows={5} />
    </CommissionerPageContainer>
  )
}
