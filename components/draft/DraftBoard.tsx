import { DraftRoomPageClient } from '@/components/app/draft-room/DraftRoomPageClient'
import { MockDraftSessionBoard } from '@/components/mock-draft/MockDraftSessionBoard'

type LiveDraftBoardProps = {
  kind: 'live'
  draftId: string
  leagueId: string
  leagueName: string
  sport: string
  isDynasty: boolean
  isCommissioner: boolean
  formatType?: string
  /** Snake redraft live room — enables premium chrome from `/draft/[id]/snake`. */
  presentationVariant?: 'default' | 'redraft_snake'
}

type MockDraftBoardProps = {
  kind: 'mock'
  draftId: string
  canManage?: boolean
}

type DraftBoardProps = LiveDraftBoardProps | MockDraftBoardProps

export function DraftBoard(props: DraftBoardProps) {
  if (props.kind === 'mock') {
    return <MockDraftSessionBoard draftId={props.draftId} canManage={props.canManage} />
  }

  return (
    <DraftRoomPageClient
      draftId={props.draftId}
      leagueId={props.leagueId}
      leagueName={props.leagueName}
      sport={props.sport}
      isDynasty={props.isDynasty}
      isCommissioner={props.isCommissioner}
      formatType={props.formatType}
      presentationVariant={props.presentationVariant ?? 'default'}
    />
  )
}
