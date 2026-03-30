'use client'

import { X, Send, Sparkles } from 'lucide-react'
import type { ProposalSummary, AiReviewState } from './DraftPickTradePanel'

type SlotOrderEntry = { slot: number; rosterId: string; displayName: string }

export type DraftPickTradePanelRootProps = {
  className: string
  loading: boolean
  currentUserRosterId: string | null
  onClose: () => void
  showOfferForm: boolean
  setShowOfferForm: (v: boolean) => void
  offerSending: boolean
  offerError: string | null
  offerGiveRound: number
  offerReceiveRound: number
  offerReceiverRosterId: string
  setOfferGiveRound: (n: number) => void
  setOfferReceiveRound: (n: number) => void
  setOfferReceiverRosterId: (s: string) => void
  setOfferError: (s: string | null) => void
  mySlot: number | null
  otherManagers: SlotOrderEntry[]
  slotOrder: SlotOrderEntry[]
  handleSubmitOffer: () => void
  proposals: ProposalSummary[]
  pendingForMe: ProposalSummary[]
  reviewId: string | null
  setReviewId: (id: string | null) => void
  aiReview: AiReviewState
  setAiReview: (v: AiReviewState) => void
  aiLoading: boolean
  respondLoading: string | null
  handleAiReview: (proposalId: string) => void
  handleRespond: (proposalId: string, action: 'accept' | 'reject' | 'counter') => void
  rounds: number
}

export function DraftPickTradePanelRoot(props: DraftPickTradePanelRootProps) {
  const {
    className,
    loading,
    currentUserRosterId,
    onClose,
    showOfferForm,
    setShowOfferForm,
    offerSending,
    offerError,
    offerGiveRound,
    offerReceiveRound,
    offerReceiverRosterId,
    setOfferGiveRound,
    setOfferReceiveRound,
    setOfferReceiverRosterId,
    setOfferError,
    mySlot,
    otherManagers,
    slotOrder,
    handleSubmitOffer,
    pendingForMe,
    reviewId,
    setReviewId,
    aiReview,
    setAiReview,
    aiLoading,
    respondLoading,
    handleAiReview,
    handleRespond,
    rounds,
  } = props

  return (
    <div className={className}>
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h3 className="text-sm font-semibold text-white">Draft pick trades</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {!currentUserRosterId ? (
          <p className="text-xs text-white/60">You don&apos;t have a roster in this draft.</p>
        ) : (
          <>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowOfferForm(!showOfferForm)}
                data-testid="draft-trade-offer-toggle"
                className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-500/20"
              >
                <Send className="h-3.5 w-3.5" />
                Offer trade
              </button>
            </div>
            {showOfferForm && (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="text-white/70">
                    My pick to give (round)
                    <select
                      value={offerGiveRound}
                      onChange={(e) => setOfferGiveRound(Number(e.target.value))}
                      data-testid="draft-trade-offer-give-round"
                      className="ml-2 rounded border border-white/20 bg-black/40 px-2 py-1 text-white"
                    >
                      {Array.from({ length: rounds }, (_, i) => i + 1).map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-white/70">
                    Receive from
                    <select
                      value={offerReceiverRosterId}
                      onChange={(e) => setOfferReceiverRosterId(e.target.value)}
                      data-testid="draft-trade-offer-receiver"
                      className="ml-2 rounded border border-white/20 bg-black/40 px-2 py-1 text-white w-full"
                    >
                      <option value="">Select manager</option>
                      {otherManagers.map((m) => (
                        <option key={m.rosterId} value={m.rosterId}>{m.displayName}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-white/70">
                    Their pick to receive (round)
                    <select
                      value={offerReceiveRound}
                      onChange={(e) => setOfferReceiveRound(Number(e.target.value))}
                      data-testid="draft-trade-offer-receive-round"
                      className="ml-2 rounded border border-white/20 bg-black/40 px-2 py-1 text-white"
                    >
                      {Array.from({ length: rounds }, (_, i) => i + 1).map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </label>
                </div>
                {offerError && <p className="text-xs text-red-400">{offerError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSubmitOffer}
                    disabled={offerSending || !offerReceiverRosterId}
                    data-testid="draft-trade-send-offer"
                    className="rounded bg-cyan-600 px-3 py-1.5 text-xs text-white hover:bg-cyan-500 disabled:opacity-50"
                  >
                    {offerSending ? 'Sending…' : 'Send offer'}
                  </button>
                  <button type="button" onClick={() => setShowOfferForm(false)} data-testid="draft-trade-cancel-offer" className="rounded border border-white/20 px-3 py-1.5 text-xs text-white/80">
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {loading ? (
              <p className="text-xs text-white/50">Loading proposals…</p>
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] font-medium uppercase text-white/50">Pending for you</p>
                {pendingForMe.length === 0 ? (
                  <p className="text-xs text-white/50">No pending offers.</p>
                ) : (
                  pendingForMe.map((p) => (
                    <div key={p.id} className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs">
                      <p className="text-white/90">
                        <strong>{p.proposerName ?? 'Team'}</strong> offers: their {p.giveRound}.{String(p.giveSlot).padStart(2, '0')} for your {p.receiveRound}.{String(p.receiveSlot).padStart(2, '0')}.
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => { setReviewId(p.id); setAiReview(null) }}
                          data-testid={`draft-trade-review-${p.id}`}
                          className="rounded border border-white/20 px-2 py-1 text-white/80 hover:bg-white/10"
                        >
                          Review
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAiReview(p.id)}
                          disabled={aiLoading}
                          data-testid={`draft-trade-ai-review-${p.id}`}
                          className="inline-flex items-center gap-1 rounded border border-violet-500/40 px-2 py-1 text-violet-200 hover:bg-violet-500/20 disabled:opacity-50"
                        >
                          <Sparkles className="h-3 w-3" />
                          {aiLoading && reviewId === p.id ? '…' : 'AI review'}
                        </button>
                      </div>
                      {reviewId === p.id && (
                        <div className="mt-3 space-y-2 border-t border-white/10 pt-3" data-testid={`draft-trade-review-panel-${p.id}`}>
                          <p className="text-[10px] text-white/50">Private review context (not posted to league chat).</p>
                          {aiReview && (
                            <div className="rounded bg-black/30 p-2 text-[11px]">
                              <p className="font-medium text-cyan-200">Suggested: {aiReview.verdict}</p>
                              <p className="mt-1 text-white/80">{aiReview.summary}</p>
                              {aiReview.executionMode && (
                                <p className="mt-1 text-[10px] text-white/50" data-testid={`draft-trade-review-execution-${p.id}`}>
                                  {aiReview.executionMode === 'ai_explained'
                                    ? 'Execution: deterministic trade model + AI explanation'
                                    : 'Execution: deterministic trade model'}
                                </p>
                              )}
                              {aiReview.reasons.length > 0 && (
                                <ul className="mt-1 list-inside list-disc text-white/70">{aiReview.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
                              )}
                              {aiReview.counterReasons.length > 0 && (
                                <div className="mt-2">
                                  <p className="font-medium text-amber-200">Counter ideas</p>
                                  <ul className="mt-1 list-inside list-disc text-amber-100/80">
                                    {aiReview.counterReasons.map((r, i) => <li key={`counter-${i}`}>{r}</li>)}
                                  </ul>
                                </div>
                              )}
                              {aiReview.declineReasons.length > 0 && (
                                <div className="mt-2">
                                  <p className="font-medium text-rose-200">Decline reasons</p>
                                  <ul className="mt-1 list-inside list-disc text-rose-100/80">
                                    {aiReview.declineReasons.map((r, i) => <li key={`decline-${i}`}>{r}</li>)}
                                  </ul>
                                </div>
                              )}
                              {aiReview.suggestedCounterPackage && (
                                <p className="mt-2 text-cyan-100/90">
                                  Suggested counter package: {aiReview.suggestedCounterPackage}
                                </p>
                              )}
                              {aiReview.privateAiDmSent && (
                                <p className="mt-2 text-[10px] text-cyan-200/80" data-testid={`draft-trade-private-ai-dm-${p.id}`}>
                                  Private AI DM sent with this review and counter suggestion.
                                </p>
                              )}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleRespond(p.id, 'accept')}
                              disabled={respondLoading === p.id}
                              data-testid={`draft-trade-accept-${p.id}`}
                              className="rounded bg-emerald-600 px-2 py-1 text-white hover:bg-emerald-500 disabled:opacity-50"
                            >
                              {respondLoading === p.id ? '…' : 'Accept'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRespond(p.id, 'reject')}
                              disabled={respondLoading === p.id}
                              data-testid={`draft-trade-reject-${p.id}`}
                              className="rounded border border-red-500/50 px-2 py-1 text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRespond(p.id, 'counter')}
                              disabled={respondLoading === p.id}
                              data-testid={`draft-trade-counter-${p.id}`}
                              className="rounded border border-amber-500/50 px-2 py-1 text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
                            >
                              Counter
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
