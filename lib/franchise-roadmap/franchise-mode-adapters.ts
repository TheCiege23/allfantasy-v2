/**
 * Franchise Mode Adapters — Dynasty, Devy, C2C Extensions
 *
 * Mode-specific analysis that layers on top of the core roadmap engine.
 */

import { getAgeCurve } from '@/lib/trade-engine/sport-tuning-registry'
import type {
  FranchiseRoadmapInput,
  DynastyRoadmapExtension,
  DevyRoadmapExtension,
  C2CRoadmapExtension,
} from './franchise-roadmap-types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

// ---------------------------------------------------------------------------
// Dynasty Extension
// ---------------------------------------------------------------------------

export function computeDynastyExtension(
  input: FranchiseRoadmapInput,
  scores: { ageScore: number; contenderScore: number; futureScore: number },
): DynastyRoadmapExtension {
  const sport = input.sport

  // Veteran sell signals: players past decline age with meaningful value
  const veteranSellSignals: string[] = []
  for (const p of input.teamRoster) {
    if (p.age == null || p.value < 3000) continue
    const curve = getAgeCurve(sport, p.position)
    if (!curve) continue
    if (p.age >= curve.declineAge) {
      const urgency = p.age >= curve.cliffAge ? 'URGENT' : 'Soon'
      veteranSellSignals.push(`${p.name} (${p.position}, age ${p.age}) — ${urgency}: sell while value remains`)
    }
  }

  // Young core foundation: players under peak age with high value
  const youngCoreFoundation: string[] = []
  for (const p of input.teamRoster) {
    if (p.age == null || p.value < 4000) continue
    const curve = getAgeCurve(sport, p.position)
    if (!curve) continue
    if (p.age < curve.peakAge) {
      youngCoreFoundation.push(`${p.name} (${p.position}, age ${p.age}) — ${curve.peakAge - p.age} years to peak`)
    }
  }
  youngCoreFoundation.sort() // Alphabetical for consistency

  // Pick leverage advice
  const earlyPicks = input.draftPicks.filter(p => p.round === 1)
  const totalPicks = input.draftPicks.length
  let pickLeverageAdvice: string

  if (scores.contenderScore >= 65 && earlyPicks.length >= 2) {
    pickLeverageAdvice = 'You have surplus 1st round picks as a contender. Trade them for proven starters to maximize your championship window.'
  } else if (scores.contenderScore < 40 && totalPicks < 3) {
    pickLeverageAdvice = 'Pick-poor while rebuilding is dangerous. Prioritize acquiring draft capital in every trade negotiation.'
  } else if (totalPicks >= 6) {
    pickLeverageAdvice = 'Loaded with picks. Use them to trade up for elite talent or package for a cornerstone player.'
  } else {
    pickLeverageAdvice = 'Moderate pick capital. Spend wisely — target value, don\'t overpay to move up.'
  }

  return {
    rosterAgeScore: scores.ageScore,
    contenderScore: scores.contenderScore,
    futureFlexibilityScore: scores.futureScore,
    veteranSellSignals: veteranSellSignals.slice(0, 5),
    youngCoreFoundation: youngCoreFoundation.slice(0, 5),
    pickLeverageAdvice,
  }
}

// ---------------------------------------------------------------------------
// Devy Extension
// ---------------------------------------------------------------------------

export function computeDevyExtension(
  input: FranchiseRoadmapInput,
): DevyRoadmapExtension {
  const devy = input.devyAssets
  const year = input.currentSeasonYear

  // Pipeline strength: count + value + age distribution
  const totalDevyValue = devy.reduce((s, d) => s + d.value, 0)
  const avgDevyAge = devy.length > 0
    ? devy.reduce((s, d) => s + (d.age ?? 20), 0) / devy.length
    : 0
  let pipelineStrengthScore = 30
  pipelineStrengthScore += Math.min(30, devy.length * 5)
  pipelineStrengthScore += Math.min(20, totalDevyValue / 2000)
  if (avgDevyAge <= 20) pipelineStrengthScore += 10
  pipelineStrengthScore = clamp(pipelineStrengthScore, 0, 100)

  // Timeline health
  const earlyEligible = devy.filter(d => d.nflDraftEligibleYear != null && d.nflDraftEligibleYear <= year + 1)
  const midEligible = devy.filter(d => d.nflDraftEligibleYear != null && d.nflDraftEligibleYear === year + 2)
  const lateEligible = devy.filter(d => d.nflDraftEligibleYear != null && d.nflDraftEligibleYear >= year + 3)

  let devyTimelineHealth: string
  if (earlyEligible.length >= 2 && midEligible.length >= 1 && lateEligible.length >= 1) {
    devyTimelineHealth = 'Balanced pipeline — staggered across classes'
  } else if (earlyEligible.length >= 3 && lateEligible.length === 0) {
    devyTimelineHealth = 'Front-loaded — most assets are near-term. Replenish the back of the pipeline.'
  } else if (lateEligible.length >= 3 && earlyEligible.length === 0) {
    devyTimelineHealth = 'Long-dated — no near-term devy production. Consider flipping for closer value.'
  } else if (devy.length <= 2) {
    devyTimelineHealth = 'Thin pipeline — need to invest in devy assets'
  } else {
    devyTimelineHealth = 'Moderate pipeline — some gaps in class distribution'
  }

  // Stash / Flip / Hold classification
  const stashPriorityTargets: string[] = []
  const flipCandidates: string[] = []
  const holdCandidates: string[] = []

  for (const d of devy) {
    const yearsOut = (d.nflDraftEligibleYear ?? year + 3) - year
    if (yearsOut <= 1 && d.value >= 3000) {
      holdCandidates.push(`${d.name} (${d.position}) — NFL-eligible soon, hold for maximum value`)
    } else if (yearsOut <= 1 && d.value < 2000) {
      flipCandidates.push(`${d.name} (${d.position}) — low value, near-eligible. Flip for picks.`)
    } else if (yearsOut >= 2 && d.value >= 2000) {
      stashPriorityTargets.push(`${d.name} (${d.position}) — ${yearsOut} years out, stash and develop`)
    } else if (yearsOut >= 3) {
      stashPriorityTargets.push(`${d.name} (${d.position}) — long-term stash`)
    }
  }

  // Class balance
  const classBalanceNotes: string[] = []
  const classCounts: Record<number, number> = {}
  for (const d of devy) {
    const classYear = d.classYear ?? d.nflDraftEligibleYear ?? year + 2
    classCounts[classYear] = (classCounts[classYear] || 0) + 1
  }
  for (const [classYear, count] of Object.entries(classCounts)) {
    classBalanceNotes.push(`${classYear} class: ${count} asset${count > 1 ? 's' : ''}`)
  }

  // Promotion windows
  const projectedPromotionWindows = earlyEligible
    .slice(0, 4)
    .map(d => `${d.name} — NFL-eligible ${d.nflDraftEligibleYear ?? 'soon'}`)

  return {
    pipelineStrengthScore,
    devyTimelineHealth,
    stashPriorityTargets: stashPriorityTargets.slice(0, 4),
    flipCandidates: flipCandidates.slice(0, 3),
    holdCandidates: holdCandidates.slice(0, 3),
    classBalanceNotes,
    projectedPromotionWindows,
  }
}

// ---------------------------------------------------------------------------
// C2C Extension
// ---------------------------------------------------------------------------

export function computeC2CExtension(
  input: FranchiseRoadmapInput,
): C2CRoadmapExtension {
  const college = input.c2cCollegeRoster
  const pro = input.c2cProRoster

  // College window score
  const collegeValue = college.reduce((s, p) => s + p.value, 0)
  const collegeAvgAge = college.length > 0
    ? college.reduce((s, p) => s + (p.age ?? 20), 0) / college.length
    : 20
  let collegeWindowScore = 30
  if (collegeValue >= 30000) collegeWindowScore += 30
  else if (collegeValue >= 15000) collegeWindowScore += 15
  if (college.length >= 8) collegeWindowScore += 15
  if (collegeAvgAge <= 21) collegeWindowScore += 10
  collegeWindowScore = clamp(collegeWindowScore, 0, 100)

  // Pro window score
  const proValue = pro.reduce((s, p) => s + p.value, 0)
  const proAvgAge = pro.length > 0
    ? pro.reduce((s, p) => s + (p.age ?? 26), 0) / pro.length
    : 26
  let proWindowScore = 30
  if (proValue >= 50000) proWindowScore += 30
  else if (proValue >= 30000) proWindowScore += 15
  if (proAvgAge <= 27) proWindowScore += 15
  if (pro.length >= 10) proWindowScore += 10
  proWindowScore = clamp(proWindowScore, 0, 100)

  // Alignment score
  const diff = Math.abs(collegeWindowScore - proWindowScore)
  const alignmentScore = clamp(100 - diff * 1.5, 0, 100)

  // Strategies
  const collegeSideStrategy = collegeWindowScore >= 65
    ? 'College roster is strong — compete now. Protect your best players and fill gaps.'
    : collegeWindowScore >= 40
      ? 'College roster is developing. Add 1-2 pieces to push toward contention.'
      : 'College side is weak. Focus on acquiring young talent and draft capital.'

  const proSideStrategy = proWindowScore >= 65
    ? 'Pro roster is championship-caliber. Push for the title — trade future for present.'
    : proWindowScore >= 40
      ? 'Pro roster has a foundation but needs reinforcements. Target strategic upgrades.'
      : 'Pro side needs a full rebuild. Sell vets, acquire picks, and plan for the future.'

  // Pipeline health
  const promotionReady = college.filter(p => p.age != null && p.age >= 22).length
  const promotionPipelineHealth = promotionReady >= 3
    ? 'Strong — multiple college players ready for promotion'
    : promotionReady >= 1
      ? 'Moderate — some pipeline but not deep'
      : 'Weak — no college players near promotion readiness'

  // Recommendations
  const campusToProRecommendations: string[] = []
  if (alignmentScore < 50) {
    campusToProRecommendations.push('Windows are misaligned — focus on bringing the weaker side up before pushing the stronger side')
  }
  if (collegeWindowScore > proWindowScore + 30) {
    campusToProRecommendations.push('College side is far ahead of pro side — convert college success into pro-side picks and players')
  }
  if (proWindowScore > collegeWindowScore + 30) {
    campusToProRecommendations.push('Pro side is strong but college is weak — invest in college pipeline to sustain long-term')
  }
  if (promotionReady >= 2) {
    campusToProRecommendations.push(`${promotionReady} college players nearing promotion — plan pro roster space`)
  }

  // Warnings
  const dualWindowWarnings: string[] = []
  if (alignmentScore < 40) dualWindowWarnings.push('Severe window misalignment — one side will struggle while the other peaks')
  if (college.length < 5 && pro.length < 8) dualWindowWarnings.push('Both rosters are thin — prioritize building one side first')
  if (collegeAvgAge >= 23 && collegeValue < 15000) dualWindowWarnings.push('College roster is aging out with low value — graduation will create holes')

  return {
    collegeWindowScore,
    proWindowScore,
    alignmentScore: Math.round(alignmentScore),
    collegeSideStrategy,
    proSideStrategy,
    promotionPipelineHealth,
    campusToProRecommendations: campusToProRecommendations.slice(0, 4),
    dualWindowWarnings: dualWindowWarnings.slice(0, 3),
  }
}
