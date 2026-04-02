/**
 * SEO landing and discovery page config.
 * Single source for sport slugs, tool slugs, metadata, and internal links.
 */

const BASE = 'https://allfantasy.ai'

export type SportSlug =
  | 'fantasy-football'
  | 'fantasy-basketball'
  | 'fantasy-baseball'
  | 'fantasy-hockey'
  | 'fantasy-soccer'
  | 'ncaa-football-fantasy'
  | 'ncaa-basketball-fantasy'

export type ToolSlug =
  | 'trade-analyzer'
  | 'mock-draft-simulator'
  | 'waiver-wire-advisor'
  | 'ai-draft-assistant'
  | 'matchup-simulator'
  | 'bracket-challenge'
  | 'power-rankings'
  | 'legacy-dynasty'
  | 'league-transfer'

export const SPORT_SLUGS: SportSlug[] = [
  'fantasy-football',
  'fantasy-basketball',
  'fantasy-baseball',
  'fantasy-hockey',
  'fantasy-soccer',
  'ncaa-football-fantasy',
  'ncaa-basketball-fantasy',
]

export const TOOL_SLUGS: ToolSlug[] = [
  'trade-analyzer',
  'mock-draft-simulator',
  'waiver-wire-advisor',
  'ai-draft-assistant',
  'matchup-simulator',
  'bracket-challenge',
  'power-rankings',
  'legacy-dynasty',
  'league-transfer',
]

export interface SportConfig {
  slug: SportSlug
  title: string
  description: string
  headline: string
  body: string
  leagueSport: string // NFL, NBA, etc.
  toolHrefs: { label: string; href: string }[]
  keywords: string[]
}

export interface ToolConfig {
  slug: ToolSlug
  title: string
  description: string
  headline: string
  benefitSummary: string
  openToolHref: string
  examples: string[]
  relatedToolSlugs: ToolSlug[]
  keywords: string[]
  faqs?: { q: string; a: string }[]
}

export const SPORT_CONFIG: Record<SportSlug, SportConfig> = {
  'fantasy-football': {
    slug: 'fantasy-football',
    leagueSport: 'NFL',
    title: 'Fantasy Football Tools – AI Trade Analyzer & More | AllFantasy',
    description:
      'AllFantasy fantasy football tools: AI trade analyzer, mock drafts, waiver wire advisor, and league management for NFL fantasy leagues.',
    headline: 'Fantasy Football Tools',
    body:
      'AllFantasy brings AI-powered fantasy football tools to your NFL leagues. Analyze trades with context-aware grades, run mock drafts, get waiver and lineup advice, and manage your league in one place. Built for redraft and dynasty.',
    keywords: ['fantasy football tools', 'NFL fantasy', 'fantasy trade analyzer', 'fantasy football AI'],
    toolHrefs: [
      { label: 'Trade Analyzer', href: '/trade-analyzer' },
      { label: 'Mock Draft', href: '/mock-draft' },
      { label: 'Waiver Wire Advisor', href: '/waiver-ai' },
      { label: 'Sports App', href: '/app' },
      { label: 'Legacy & Dynasty', href: '/af-legacy' },
    ],
  },
  'fantasy-basketball': {
    slug: 'fantasy-basketball',
    leagueSport: 'NBA',
    title: 'Fantasy Basketball Tools – AI Analysis & League Management | AllFantasy',
    description:
      'AllFantasy fantasy basketball tools for NBA leagues: trade analyzer, waiver advice, power rankings, and AI-powered draft and lineup help.',
    headline: 'Fantasy Basketball Tools',
    body:
      'AllFantasy supports NBA fantasy basketball with AI trade analysis, waiver wire recommendations, power rankings, and draft tools. Use the Sports App for league management and the Trade Analyzer for deal evaluation.',
    keywords: ['fantasy basketball tools', 'NBA fantasy', 'fantasy basketball AI', 'basketball trade analyzer'],
    toolHrefs: [
      { label: 'Trade Analyzer', href: '/trade-analyzer' },
      { label: 'Mock Draft', href: '/mock-draft' },
      { label: 'Waiver Advisor', href: '/waiver-ai' },
      { label: 'Power Rankings', href: '/app/power-rankings' },
      { label: 'Sports App', href: '/app' },
    ],
  },
  'fantasy-baseball': {
    slug: 'fantasy-baseball',
    leagueSport: 'MLB',
    title: 'Fantasy Baseball Tools – AI Trade Analyzer & Waiver Help | AllFantasy',
    description:
      'AllFantasy fantasy baseball tools for MLB leagues: AI trade analyzer, waiver wire advisor, mock drafts, and dynasty management.',
    headline: 'Fantasy Baseball Tools',
    body:
      'AllFantasy offers fantasy baseball tools for MLB redraft and dynasty leagues. Analyze trades, get waiver and lineup advice, run mock drafts, and use Chimmy AI for real-time guidance.',
    keywords: ['fantasy baseball tools', 'MLB fantasy', 'fantasy baseball AI', 'baseball trade analyzer'],
    toolHrefs: [
      { label: 'Trade Analyzer', href: '/trade-analyzer' },
      { label: 'Waiver Advisor', href: '/waiver-ai' },
      { label: 'Mock Draft', href: '/mock-draft' },
      { label: 'Sports App', href: '/app' },
      { label: 'Chimmy AI', href: '/chimmy' },
    ],
  },
  'fantasy-hockey': {
    slug: 'fantasy-hockey',
    leagueSport: 'NHL',
    title: 'Fantasy Hockey Tools – AI Analysis & League Tools | AllFantasy',
    description:
      'AllFantasy fantasy hockey tools for NHL leagues: trade analyzer, waiver wire advisor, mock drafts, and AI-powered league management.',
    headline: 'Fantasy Hockey Tools',
    body:
      'AllFantasy supports NHL fantasy hockey with AI trade analysis, waiver recommendations, mock draft simulator, and league management in the Sports App. Dynasty and redraft supported.',
    keywords: ['fantasy hockey tools', 'NHL fantasy', 'fantasy hockey AI', 'hockey trade analyzer'],
    toolHrefs: [
      { label: 'Trade Analyzer', href: '/trade-analyzer' },
      { label: 'Mock Draft', href: '/mock-draft' },
      { label: 'Waiver Advisor', href: '/waiver-ai' },
      { label: 'Sports App', href: '/app' },
      { label: 'Legacy', href: '/af-legacy' },
    ],
  },
  'fantasy-soccer': {
    slug: 'fantasy-soccer',
    leagueSport: 'SOCCER',
    title: 'Fantasy Soccer Tools – AI Trade & League Management | AllFantasy',
    description:
      'AllFantasy fantasy soccer tools: AI trade analyzer, waiver advice, and league management for fantasy soccer leagues.',
    headline: 'Fantasy Soccer Tools',
    body:
      'AllFantasy brings AI-powered tools to fantasy soccer: trade analysis, waiver wire advisor, and league management. Use the Sports App and Trade Analyzer for smarter decisions.',
    keywords: ['fantasy soccer tools', 'soccer fantasy', 'fantasy soccer AI', 'soccer trade analyzer'],
    toolHrefs: [
      { label: 'Trade Analyzer', href: '/trade-analyzer' },
      { label: 'Waiver Advisor', href: '/waiver-ai' },
      { label: 'Sports App', href: '/app' },
      { label: 'Chimmy AI', href: '/chimmy' },
    ],
  },
  'ncaa-football-fantasy': {
    slug: 'ncaa-football-fantasy',
    leagueSport: 'NCAAF',
    title: 'NCAA Football Fantasy Tools – AI Analysis & Dynasty | AllFantasy',
    description:
      'AllFantasy NCAA football fantasy tools: trade analyzer, waiver advisor, and dynasty league management for college fantasy football.',
    headline: 'NCAA Football Fantasy Tools',
    body:
      'AllFantasy supports NCAA football fantasy with AI trade analysis, waiver wire advice, and dynasty tools. Use the Sports App and Legacy experience for college fantasy leagues.',
    keywords: ['NCAA football fantasy', 'college fantasy football', 'NCAAF fantasy tools'],
    toolHrefs: [
      { label: 'Trade Analyzer', href: '/trade-analyzer' },
      { label: 'Waiver Advisor', href: '/waiver-ai' },
      { label: 'Sports App', href: '/app' },
      { label: 'Legacy & Dynasty', href: '/af-legacy' },
    ],
  },
  'ncaa-basketball-fantasy': {
    slug: 'ncaa-basketball-fantasy',
    leagueSport: 'NCAAB',
    title: 'NCAA Basketball Fantasy & Bracket Tools | AllFantasy',
    description:
      'AllFantasy NCAA basketball tools: bracket challenge, fantasy league management, and AI-powered bracket analysis and pool management.',
    headline: 'NCAA Basketball Fantasy & Bracket Tools',
    body:
      'AllFantasy offers NCAA basketball bracket challenges, pool management, and fantasy league tools. Compete in bracket contests and use AI to stress-test your picks. Fantasy league support for NCAAB.',
    keywords: ['NCAA basketball fantasy', 'bracket challenge', 'March Madness', 'NCAAB fantasy'],
    toolHrefs: [
      { label: 'Bracket Challenge', href: '/bracket' },
      { label: 'Bracket Hub', href: '/brackets' },
      { label: 'Trade Analyzer', href: '/trade-analyzer' },
      { label: 'Sports App', href: '/app' },
    ],
  },
}

export const TOOL_CONFIG: Record<ToolSlug, ToolConfig> = {
  'trade-analyzer': {
    slug: 'trade-analyzer',
    title: 'Fantasy Trade Analyzer – AI-Powered Trade Grades | AllFantasy',
    description:
      'AllFantasy trade analyzer evaluates fantasy football, basketball, baseball, and more with AI grades, context-aware analysis, and counter-offer suggestions.',
    headline: 'Fantasy Trade Analyzer',
    benefitSummary:
      'Get deterministic trade grades, lineup impact, and replacement value in context. Stop arguing in the group chat—show the receipts.',
    openToolHref: '/trade-evaluator',
    examples: [
      'Evaluate redraft and dynasty trades with league context',
      'See letter grades and AI explanations for both sides',
      'Get counter-offer suggestions to maximize value',
    ],
    relatedToolSlugs: ['mock-draft-simulator', 'waiver-wire-advisor', 'ai-draft-assistant', 'legacy-dynasty'],
    keywords: ['fantasy trade analyzer', 'trade analyzer', 'fantasy football trade', 'AI trade analysis'],
    faqs: [
      { q: 'What sports does the trade analyzer support?', a: 'NFL, NBA, MLB, NHL, NCAA Basketball, NCAA Football, and Soccer. Redraft and dynasty formats.' },
      { q: 'How does the AI grade trades?', a: 'Grades consider lineup impact, replacement value, and your league settings. You get letter grades and explanations for both sides.' },
      { q: 'Do I need to connect my league?', a: 'You can use the analyzer standalone or with a connected league for better context.' },
    ],
  },
  'mock-draft-simulator': {
    slug: 'mock-draft-simulator',
    title: 'Mock Draft Simulator – Fantasy Football & More | AllFantasy',
    description:
      'Run fantasy mock drafts with AllFantasy: snake and auction, multiple sports, AI-powered suggestions. Practice before your real draft.',
    headline: 'Mock Draft Simulator',
    benefitSummary:
      'Practice snake or auction drafts with AI recommendations. Use it for NFL, NBA, MLB, and other sports. Save and share results.',
    openToolHref: '/mock-draft',
    examples: [
      'Snake and auction mock drafts',
      'AI-powered pick suggestions and rankings',
      'Save drafts and share with league mates',
    ],
    relatedToolSlugs: ['trade-analyzer', 'ai-draft-assistant', 'waiver-wire-advisor', 'legacy-dynasty'],
    keywords: ['mock draft simulator', 'fantasy mock draft', 'draft simulator', 'AI draft'],
  },
  'waiver-wire-advisor': {
    slug: 'waiver-wire-advisor',
    title: 'Waiver Wire Advisor – AI Pickup & Lineup Help | AllFantasy',
    description:
      'AllFantasy waiver wire advisor gives AI-powered pickup recommendations and lineup help tuned to your league settings and scoring.',
    headline: 'Waiver Wire Advisor',
    benefitSummary:
      'Get pickup and lineup recommendations based on your league. AI considers scoring, roster needs, and availability.',
    openToolHref: '/waiver-ai',
    examples: [
      'Waiver and free-agent pickup recommendations',
      'Lineup optimization suggestions',
      'League-context aware advice',
    ],
    relatedToolSlugs: ['trade-analyzer', 'mock-draft-simulator', 'ai-draft-assistant', 'matchup-simulator'],
    keywords: ['waiver wire advisor', 'fantasy waiver', 'pickup recommendations', 'lineup help'],
  },
  'ai-draft-assistant': {
    slug: 'ai-draft-assistant',
    title: 'AI Draft Assistant – Fantasy Draft Help | AllFantasy',
    description:
      'AllFantasy AI draft assistant helps you draft smarter with real-time rankings, strategy tips, and Chimmy AI guidance during your draft.',
    headline: 'AI Draft Assistant',
    benefitSummary:
      'Draft with AI support: rankings, strategy, and Chimmy answering your questions in real time.',
    openToolHref: '/af-legacy?tab=mock-draft',
    examples: [
      'Real-time draft rankings and suggestions',
      'Chimmy AI for draft questions',
      'Snake and auction support',
    ],
    relatedToolSlugs: ['mock-draft-simulator', 'trade-analyzer', 'waiver-wire-advisor', 'legacy-dynasty'],
    keywords: ['AI draft assistant', 'fantasy draft help', 'draft assistant', 'Chimmy AI'],
  },
  'matchup-simulator': {
    slug: 'matchup-simulator',
    title: 'Matchup Simulator – Fantasy Projections & Scenarios | AllFantasy',
    description:
      'AllFantasy matchup simulator: run season and playoff scenarios, project head-to-head outcomes, and explore dynasty simulations.',
    headline: 'Matchup Simulator',
    benefitSummary:
      'Simulate seasons, playoffs, and matchups. Use data-driven scenarios for redraft and dynasty.',
    openToolHref: '/app/simulation-lab',
    examples: [
      'Season and playoff simulations',
      'Head-to-head and scoring projections',
      'Dynasty scenario modeling',
    ],
    relatedToolSlugs: ['power-rankings', 'waiver-wire-advisor', 'trade-analyzer', 'legacy-dynasty'],
    keywords: ['matchup simulator', 'fantasy simulation', 'projection tool', 'playoff simulator'],
  },
  'bracket-challenge': {
    slug: 'bracket-challenge',
    title: 'NCAA Bracket Challenge – Pools & AI Analysis | AllFantasy',
    description:
      'AllFantasy NCAA bracket challenge: create pools, invite friends, fill out brackets, and use AI to stress-test your picks. Compete in public and private contests.',
    headline: 'NCAA Bracket Challenge',
    benefitSummary:
      'Build bracket pools, track standings, and get AI bracket analysis. March Madness made social and smart.',
    openToolHref: '/bracket',
    examples: [
      'Create and join bracket pools',
      'AI bracket review and simulation',
      'Live standings and leaderboards',
    ],
    relatedToolSlugs: ['power-rankings', 'legacy-dynasty', 'trade-analyzer'],
    keywords: ['bracket challenge', 'NCAA bracket', 'March Madness', 'bracket pool'],
  },
  'power-rankings': {
    slug: 'power-rankings',
    title: 'Fantasy Power Rankings – League Rankings Tool | AllFantasy',
    description:
      'AllFantasy power rankings: see how your team stacks up across your leagues. AI-powered fantasy power rankings for multiple sports.',
    headline: 'Power Rankings',
    benefitSummary:
      'View power rankings across your leagues. Compare teams and track movement over the season.',
    openToolHref: '/app/power-rankings',
    examples: [
      'League and cross-league power rankings',
      'Sport-specific and multi-sport support',
      'Track rankings over time',
    ],
    relatedToolSlugs: ['matchup-simulator', 'trade-analyzer', 'waiver-wire-advisor', 'bracket-challenge'],
    keywords: ['power rankings', 'fantasy rankings', 'league rankings', 'fantasy power rankings'],
  },
  'legacy-dynasty': {
    slug: 'legacy-dynasty',
    title: 'Legacy & Dynasty Fantasy Tools | AllFantasy',
    description:
      'AllFantasy Legacy: dynasty history, hall of fame moments, legacy score, reputation system, and classic fantasy tools for long-run league play.',
    headline: 'Legacy & Dynasty Tools',
    benefitSummary:
      'Track your dynasty history, rivalries, hall of fame moments, and fantasy legacy. Deep league history and commissioner-style tools.',
    openToolHref: '/af-legacy',
    examples: [
      'Dynasty history and legacy score',
      'Hall of fame moments and reputation',
      'Trade analyzer, waiver AI, and Chimmy chat',
    ],
    relatedToolSlugs: ['trade-analyzer', 'mock-draft-simulator', 'waiver-wire-advisor', 'bracket-challenge'],
    keywords: ['dynasty fantasy', 'legacy fantasy', 'hall of fame fantasy', 'fantasy commissioner'],
  },
  'league-transfer': {
    slug: 'league-transfer',
    title: 'League Transfer – Move Your League to AllFantasy | AllFantasy',
    description:
      'Move your full league from Sleeper, Yahoo, MFL, ESPN, Fleaflicker, or Fantrax to AllFantasy with manager names, settings, rosters, draft history, playoffs, and trades copied over.',
    headline: 'League Transfer',
    benefitSummary:
      'Commissioners can move a league into AllFantasy with an exact transfer flow for league settings, managers, rosters, and historical context.',
    openToolHref: '/league-transfer',
    examples: [
      'Transfer a full Sleeper league into AllFantasy',
      'Preview manager names, format, and roster positions before import',
      'Bring draft history, playoff brackets, and trade history into one commissioner workspace',
    ],
    relatedToolSlugs: ['power-rankings', 'legacy-dynasty', 'trade-analyzer'],
    keywords: ['league transfer', 'commissioner tools', 'import fantasy league', 'move Sleeper league'],
  },
}

export function getSportCanonical(slug: SportSlug): string {
  return `${BASE}/sports/${slug}`
}

export function getToolCanonical(slug: ToolSlug): string {
  return `${BASE}/tools/${slug}`
}

export const TOOLS_HUB_TITLE = 'Fantasy Tools Hub – All Tools & Sports | AllFantasy'
export const TOOLS_HUB_DESCRIPTION =
  'Discover AllFantasy tools: trade analyzer, mock draft, waiver advisor, bracket challenge, power rankings, and AI fantasy assistant. Browse by sport and tool.'

export const CHIMMY_TITLE = 'Chimmy AI – Your Fantasy Sports Assistant | AllFantasy'
export const CHIMMY_DESCRIPTION =
  'Chimmy is AllFantasy’s AI fantasy assistant: draft help, trade analysis, waiver advice, matchup predictions, and league storytelling. Sport-specific guidance.'
