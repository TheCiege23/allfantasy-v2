/**
 * PROMPT 161 — AI tool SEO landing pages config.
 * Routes: /trade-analyzer, /waiver-wire, /draft-helper, /player-comparison, /matchup-simulator, /fantasy-coach
 */

export interface AIToolSeoConfig {
  title: string
  description: string
  headline: string
  body: string
  benefits: string[]
  openToolHref: string
  openToolLabel: string
}

export const AI_TOOL_PAGES = {
  'trade-analyzer': {
    title: 'Trade Analyzer – AI-Powered Fantasy Trade Grades | AllFantasy',
    description:
      'AllFantasy trade analyzer evaluates fantasy trades with AI grades, lineup impact, and counter-offer suggestions. NFL, NBA, MLB, NHL, and more.',
    headline: 'Trade Analyzer',
    body:
      'Evaluate fantasy trades with AI-powered grades and context-aware analysis. Get fairness scores, lineup impact, and smarter counter-offers so you can stop arguing in the group chat and show the receipts.',
    benefits: [
      'Letter grades and explanations for both sides of any trade',
      'Lineup impact and replacement value in your league context',
      'Counter-offer suggestions to maximize value',
      'Works for redraft and dynasty across NFL, NBA, MLB, NHL, NCAA, and soccer',
    ],
    openToolHref: '/trade-evaluator',
    openToolLabel: 'Open Trade Analyzer',
  },
  'waiver-wire': {
    title: 'Waiver Wire AI – Pickup & Lineup Recommendations | AllFantasy',
    description:
      'AllFantasy waiver wire AI gives pickup and lineup recommendations tuned to your league. Get waiver priorities and start/sit help powered by AI.',
    headline: 'Waiver Wire AI',
    body:
      'Get AI-powered waiver wire and free-agent recommendations based on your league settings and roster needs. Prioritize pickups and optimize your lineup with context-aware advice.',
    benefits: [
      'Waiver and free-agent pickup priorities for your league',
      'Lineup optimization and start/sit suggestions',
      'Scoring and roster context considered',
      'Available inside the AllFantasy Sports App',
    ],
    openToolHref: '/waiver-ai',
    openToolLabel: 'Open Waiver Wire AI',
  },
  'draft-helper': {
    title: 'Draft Helper – AI Draft Assistant & Mock Drafts | AllFantasy',
    description:
      'AllFantasy draft helper: run mock drafts, get AI pick suggestions, and use Chimmy for real-time draft strategy. Snake and auction, multiple sports.',
    headline: 'Draft Helper',
    body:
      'Draft smarter with AI: run mock drafts, get real-time rankings and pick suggestions, and ask Chimmy for strategy during your draft. Supports snake and auction for NFL, NBA, MLB, and more.',
    benefits: [
      'Mock drafts (snake and auction) with AI suggestions',
      'Real-time rankings and strategy tips',
      'Chimmy AI for draft questions and guidance',
      'Practice before your real draft day',
    ],
    openToolHref: '/mock-draft',
    openToolLabel: 'Open Draft Helper',
  },
  'player-comparison': {
    title: 'Player Comparison Lab – Side-by-Side Fantasy Analysis | AllFantasy',
    description:
      'AllFantasy player comparison lab: compare players side-by-side with projections, trends, and AI insights. Built for redraft and dynasty.',
    headline: 'Player Comparison Lab',
    body:
      'Compare fantasy players side-by-side with projections, usage trends, and outlook. Use the lab to decide between similar players, evaluate trade targets, or plan waiver pickups.',
    benefits: [
      'Compare up to several players at once',
      'Projections, trends, and ROS outlook',
      'Injury and usage context',
      'Available in the AllFantasy Sports App',
    ],
    openToolHref: '/player-comparison-lab',
    openToolLabel: 'Open Player Comparison Lab',
  },
  'matchup-simulator': {
    title: 'Matchup Simulator – Fantasy Projections & Scenarios | AllFantasy',
    description:
      'AllFantasy matchup simulator: run season and playoff scenarios, project head-to-head outcomes, and explore dynasty simulations. Data-driven fantasy decisions.',
    headline: 'Matchup Simulator',
    body:
      'Simulate matchups, seasons, and playoff scenarios with the AllFantasy simulation lab. Project head-to-head outcomes and explore dynasty scenarios so you can make data-driven decisions.',
    benefits: [
      'Season and playoff simulations',
      'Head-to-head and scoring projections',
      'Dynasty scenario modeling',
      'Part of the AllFantasy Sports App',
    ],
    openToolHref: '/app/simulation-lab',
    openToolLabel: 'Open Matchup Simulator',
  },
  'fantasy-coach': {
    title: 'Fantasy Coach – AI Strategy & Lineup Help | AllFantasy',
    description:
      'AllFantasy fantasy coach: get AI coaching, strategy advice, and lineup help tailored to your league. Your AI co-GM for trades, waivers, and draft.',
    headline: 'Fantasy Coach',
    body:
      'Get AI coaching and strategy advice tailored to your leagues. The fantasy coach helps with trades, waivers, lineup decisions, and draft strategy—like having a co-GM in your pocket.',
    benefits: [
      'AI coaching and strategy tailored to your league',
      'Trade, waiver, and lineup advice',
      'Draft strategy and real-time guidance',
      'Available in the AllFantasy Sports App',
    ],
    openToolHref: '/app/coach',
    openToolLabel: 'Open Fantasy Coach',
  },
} as const satisfies Record<string, AIToolSeoConfig>

export type AIToolPageSlug = keyof typeof AI_TOOL_PAGES

export const AI_TOOL_PAGE_SLUGS: AIToolPageSlug[] = [
  'trade-analyzer',
  'waiver-wire',
  'draft-helper',
  'player-comparison',
  'matchup-simulator',
  'fantasy-coach',
]

const BASE = 'https://allfantasy.ai'

export function getAIToolPageCanonical(slug: AIToolPageSlug): string {
  return `${BASE}/${slug}`
}
