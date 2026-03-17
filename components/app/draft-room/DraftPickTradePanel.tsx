'use client'

import { useState, useCallback, useEffect } from 'react'
import { X, Send, MessageSquare, Sparkles } from 'lucide-react'
import { DraftPickTradePanelRoot } from './DraftPickTradePanelRoot'

export type ProposalSummary = {
  id: string
  proposerRosterId: string
  receiverRosterId: string
  giveRound: number
  giveSlot: number
  receiveRound: number
  receiveSlot: number
  proposerName?: string | null
  receiverName?: string | null
  status: string
  createdAt: string
}

export type AiReviewState = {
  verdict: string
  reasons: string[]
  declineReasons: string[]
  counterReasons: string[]
  summary: string
} | null

export type DraftPickTradePanelProps = {
  leagueId: string
  sessionId: string
  slotOrder: { slot: number; rosterId: string; displayName: string }[]
  teamCount: number
  rounds: number
  currentUserRosterId: string | null
  onClose: () => void
  /** Called when a trade is accepted; optional session from API to update draft room state. */
  onTradeAccepted?: (updatedSession?: unknown) => void
}

export function DraftPickTradePanel({
  leagueId,
  slotOrder,
  teamCount,
  rounds,
  currentUserRosterId,
  onClose,
  onTradeAccepted,
}: DraftPickTradePanelProps) {
  const [proposals, setProposals] = useState<ProposalSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewId, setReviewId] = useState<string | null>(null)
  const [aiReview, setAiReview] = useState<AiReviewState>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [respondLoading, setRespondLoading] = useState<string | null>(null)
  const [showOfferForm, setShowOfferForm] = useState(false)
  const [offerSending, setOfferSending] = useState(false)
  const [offerGiveRound, setOfferGiveRound] = useState(1)
  const [offerReceiveRound, setOfferReceiveRound] = useState(1)
  const [offerReceiverRosterId, setOfferReceiverRosterId] = useState('')
  const [offerError, setOfferError] = useState<string | null>(null)

  const mySlot = currentUserRosterId ? slotOrder.find((e) => e.rosterId === currentUserRosterId)?.slot : null
  const otherManagers = slotOrder.filter((e) => e.rosterId !== currentUserRosterId)

  const fetchProposals = useCallback(async () => {
    if (!leagueId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/trade-proposals`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (res.ok && Array.isArray(data.proposals)) setProposals(data.proposals)
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => {
    fetchProposals()
  }, [fetchProposals])

  const handleAiReview = useCallback(
    async (proposalId: string) => {
      setAiLoading(true)
      setAiReview(null)
      setReviewId(proposalId)
      try {
        const res = await fetch(
          `/api/leagues/${encodeURIComponent(leagueId)}/draft/trade-proposals/${encodeURIComponent(proposalId)}/review`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }
        )
        const data = await res.json().catch(() => ({}))
        if (res.ok && data.ok) {
          setAiReview({
            verdict: data.verdict ?? 'accept',
            reasons: data.reasons ?? [],
            declineReasons: data.declineReasons ?? [],
            counterReasons: data.counterReasons ?? [],
            summary: data.summary ?? '',
          })
        }
      } finally {
        setAiLoading(false)
      }
    },
    [leagueId]
  )

  const handleRespond = useCallback(
    async (proposalId: string, action: 'accept' | 'reject' | 'counter') => {
      setRespondLoading(proposalId)
      try {
        const res = await fetch(
          `/api/leagues/${encodeURIComponent(leagueId)}/draft/trade-proposals/${encodeURIComponent(proposalId)}/respond`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action }),
          }
        )
        const data = await res.json().catch(() => ({}))
        if (res.ok && data.ok) {
          setReviewId(null)
          setAiReview(null)
          await fetchProposals()
          if ((action === 'accept' || data.action === 'accepted') && data.session) onTradeAccepted?.(data.session)
          else if (action === 'accept') onTradeAccepted?.()
        }
      } finally {
        setRespondLoading(null)
      }
    },
    [leagueId, fetchProposals, onTradeAccepted]
  )

  const handleSubmitOffer = useCallback(async () => {
    if (!currentUserRosterId || !offerReceiverRosterId || mySlot == null) return
    setOfferSending(true)
    setOfferError(null)
    try {
      const receiver = otherManagers.find((m) => m.rosterId === offerReceiverRosterId)
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/trade-proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          giveRound: offerGiveRound,
          giveSlot: mySlot,
          receiveRound: offerReceiveRound,
          receiveSlot: receiver ? slotOrder.find((e) => e.rosterId === offerReceiverRosterId)?.slot ?? 1 : 1,
          receiverRosterId: offerReceiverRosterId,
          receiverName: receiver?.displayName ?? '',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        setShowOfferForm(false)
        await fetchProposals()
      } else {
        setOfferError(data.error ?? 'Failed to send offer')
      }
    } finally {
      setOfferSending(false)
    }
  }, [leagueId, currentUserRosterId, offerReceiverRosterId, offerGiveRound, offerReceiveRound, mySlot, otherManagers, slotOrder, fetchProposals]);

  const pendingForMe = proposals.filter((p) => p.status === 'pending' && p.receiverRosterId === currentUserRosterId);

  return (
    <DraftPickTradePanelRoot
      className="flex flex-col rounded-xl border border-white/12 bg-black/40 shadow-xl"
      loading={loading}
      currentUserRosterId={currentUserRosterId}
      onClose={onClose}
      showOfferForm={showOfferForm}
      setShowOfferForm={setShowOfferForm}
      offerSending={offerSending}
      offerError={offerError}
      offerGiveRound={offerGiveRound}
      offerReceiveRound={offerReceiveRound}
      offerReceiverRosterId={offerReceiverRosterId}
      setOfferGiveRound={setOfferGiveRound}
      setOfferReceiveRound={setOfferReceiveRound}
      setOfferReceiverRosterId={setOfferReceiverRosterId}
      setOfferError={setOfferError}
      mySlot={mySlot ?? null}
      otherManagers={otherManagers}
      slotOrder={slotOrder}
      handleSubmitOffer={handleSubmitOffer}
      proposals={proposals}
      pendingForMe={pendingForMe}
      reviewId={reviewId}
      setReviewId={setReviewId}
      aiReview={aiReview}
      setAiReview={setAiReview}
      aiLoading={aiLoading}
      respondLoading={respondLoading}
      handleAiReview={handleAiReview}
      handleRespond={handleRespond}
      rounds={rounds}
    />
  )
}
