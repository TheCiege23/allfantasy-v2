import { CommissionerPageContainer } from '@/components/commissioner-os/shell/CommissionerPageContainer'
import { LoadingState } from '@/components/commissioner-os/states'

export default function LeagueAnalyticsLoading() {
  return (
    <CommissionerPageContainer>
      <LoadingState rows={6} />
    </CommissionerPageContainer>
  )
}
