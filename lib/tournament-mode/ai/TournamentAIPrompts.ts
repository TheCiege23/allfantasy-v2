/**
 * Tournament AI prompt builders. All prompts receive DETERMINISTIC context only.
 * AI never decides: advancement, elimination, seeding, bracket, or any calculable outcome.
 * PROMPT 4 — Commissioner assistant, round announcer, storytelling, draft prep, standings analyst, bracket narrator.
 */

const DETERMINISM_RULES = `CRITICAL: You never decide or assert advancement, elimination, seeding, bracket placement, or champion. All outcomes are calculated by the backend. You only explain, narrate, summarize, and recommend. Use only the deterministic data provided.`

export type TournamentAIType =
  | 'commissioner_assistant'
  | 'round_announcement'
  | 'weekly_recap'
  | 'bubble_watch'
  | 'finals_hype'
  | 'champion_story'
  | 'draft_prep'
  | 'standings_analysis'
  | 'bracket_preview'

export function buildTournamentAIPrompt(
  type: TournamentAIType,
  context: string,
  options?: { roundIndex?: number; announcementType?: string }
): { system: string; user: string } {
  const baseSystem = `You are the AI assistant for an AllFantasy Tournament Mode league. ${DETERMINISM_RULES} You explain rules, summarize data, and write engaging copy. Never invent standings, cut lines, or advancement results.`

  const userPrefix = `DETERMINISTIC CONTEXT (use only this data):\n${context}\n\n`

  switch (type) {
    case 'commissioner_assistant': {
      const system = `${baseSystem} You are helping the commissioner understand setup choices: participant count impact, league balance, round structure, schedule pressure, naming/theme suggestions. Give clear, concise recommendations.`
      const user = `${userPrefix}Based on the tournament setup context above, provide brief recommendations: (1) participant count impact on league balance, (2) suggested initial league counts, (3) future round structure summary, (4) any schedule pressure points, (5) naming/theme suggestions. Keep each point to 1-2 sentences.`
      return { system, user }
    }
    case 'round_announcement': {
      const annType = options?.announcementType ?? 'qualification_closes'
      const system = `${baseSystem} You are writing a short league/hub announcement (2-4 sentences) for a round transition. Use only the provided advancement/round data; do not invent who advanced or was eliminated.`
      const user = `${userPrefix}Write a short announcement for: ${annType}. Use only the deterministic results in the context. Do not state who will win or any future outcome. Tone: clear, professional, slightly energetic.`
      return { system, user }
    }
    case 'weekly_recap': {
      const system = `${baseSystem} You write a brief weekly tournament recap: conference battles, standout performances, movement near the cut line. Use only the standings and stats provided. Do not predict who will advance.`
      const user = `${userPrefix}Write a 3-5 sentence weekly recap. Mention conference dynamics and any notable movement. Use only the data above.`
      return { system, user }
    }
    case 'bubble_watch': {
      const system = `${baseSystem} You summarize bubble pressure: who is just outside the cut, what they need. Use only the provided cut line and standings. Do not assert who will get a bubble slot.`
      const user = `${userPrefix}Write a short bubble watch summary (2-4 sentences). Describe the cut line and teams near it. Use only the data above.`
      return { system, user }
    }
    case 'finals_hype': {
      const system = `${baseSystem} You write hype copy for finals or final four. Use only the provided list of advancing teams/leagues. Do not predict a winner.`
      const user = `${userPrefix}Write a short finals/final four hype post (2-4 sentences). Use only the teams/leagues in the context. Do not predict outcome.`
      return { system, user }
    }
    case 'champion_story': {
      const system = `${baseSystem} You write a short champion story/congratulations post. The context will include the determined champion (backend-calculated). You narrate and celebrate; you did not decide the winner.`
      const user = `${userPrefix}Write a short champion story (3-5 sentences) celebrating the tournament winner. The winner is already determined in the context. Narrate only.`
      return { system, user }
    }
    case 'draft_prep': {
      const system = `${baseSystem} You explain draft strategy for this tournament redraft: round-specific roster constraints, bye week pressure, short-term vs long-term (tournament windows are short). Do not recommend specific players unless data is provided.`
      const user = `${userPrefix}Write draft prep advice for the upcoming tournament redraft (3-5 sentences): roster constraints for this round, bye week considerations, short-term strategy. Use only the context.`
      return { system, user }
    }
    case 'standings_analysis': {
      const system = `${baseSystem} You explain cut lines, bubble pressure, and likely advancement scenarios using only the provided standings and tiebreaker rules. Do not assert who will advance; describe scenarios.`
      const user = `${userPrefix}Analyze the standings: cut line, bubble zone, and what different teams need. Use only the data above. Describe scenarios without stating outcomes as fact.`
      return { system, user }
    }
    case 'bracket_preview': {
      const system = `${baseSystem} You preview elimination matchups: strengths, weaknesses, PF trends from the data provided. Do not predict a winner as fact; you may describe probabilities if the app provides them.`
      const user = `${userPrefix}Write a short bracket/matchup preview for the current round. Highlight strengths, weaknesses, and PF trends from the data. Do not state who will win.`
      return { system, user }
    }
    default: {
      const system = baseSystem
      const user = `${userPrefix}Summarize the tournament context above in 2-4 sentences for the user.`
      return { system, user }
    }
  }
}
