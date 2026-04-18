import 'server-only'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { DEFAULT_SPORT, normalizeToSupportedSport } from '@/lib/sport-scope'

export type ChimmyAgentType =
  | 'trade_analyzer'
  | 'waiver_wire'
  | 'draft_assistant'
  | 'matchup_simulator'
  | 'player_comparison'
  | 'power_rankings'
  | 'bracket'
  | 'dynasty_legacy'
  | 'c2c_specialist'
  | 'storyline'

const PROMPT_DIR = path.join(process.cwd(), 'lib', 'agents', 'prompts')
const SYSTEM_PROMPT_FILE = 'chimmy_system_prompt.md'

const AGENT_PROMPT_FILE_MAP: Record<ChimmyAgentType, string> = {
  trade_analyzer: 'trade_analyzer_agent_prompt.md',
  waiver_wire: 'waiver_wire_agent_prompt.md',
  draft_assistant: 'draft_assistant_agent_prompt.md',
  matchup_simulator: 'matchup_simulator_agent_prompt.md',
  player_comparison: 'player_comparison_agent_prompt.md',
  power_rankings: 'power_rankings_agent_prompt.md',
  bracket: 'bracket_agent_prompt.md',
  dynasty_legacy: 'dynasty_legacy_agent_prompt.md',
  c2c_specialist: 'c2c_agent_prompt.md',
  storyline: 'storyline_agent_prompt.md',
}

const promptCache = new Map<string, string>()

async function readPromptFile(fileName: string): Promise<string> {
  if (promptCache.has(fileName)) {
    return promptCache.get(fileName) as string
  }

  const filePath = path.join(PROMPT_DIR, fileName)
  const text = await fs.readFile(filePath, 'utf8')
  const normalized = text.trim()
  promptCache.set(fileName, normalized)
  return normalized
}

export async function getChimmySystemPrompt(): Promise<string> {
  return readPromptFile(SYSTEM_PROMPT_FILE)
}

export async function getSpecialistAgentPrompt(agent: ChimmyAgentType): Promise<string> {
  return readPromptFile(AGENT_PROMPT_FILE_MAP[agent])
}

export type BuildAgentPromptInput = {
  agent: ChimmyAgentType
  userMessage: string
  sport?: string | null
  deterministicContext?: Record<string, unknown> | null
  conversationContext?: string | null
}

export async function buildAgentPrompt(input: BuildAgentPromptInput): Promise<string> {
  const [systemPrompt, specialistPrompt] = await Promise.all([
    getChimmySystemPrompt(),
    getSpecialistAgentPrompt(input.agent),
  ])

  const sport = normalizeToSupportedSport(input.sport || DEFAULT_SPORT)
  const deterministicContext =
    input.deterministicContext && Object.keys(input.deterministicContext).length > 0
      ? JSON.stringify(input.deterministicContext, null, 2)
      : '{}'

  const convoContext = (input.conversationContext || '').trim()

  return [
    systemPrompt,
    '',
    '---',
    '',
    specialistPrompt,
    '',
    '---',
    '',
    '## Runtime Context',
    `- Target sport: ${sport}`,
    `- Agent: ${input.agent}`,
    '',
    '### User Message',
    input.userMessage.trim() || '(empty user message)',
    '',
    '### Deterministic Context JSON',
    deterministicContext,
    '',
    '### Conversation Context',
    convoContext || '(none provided)',
  ].join('\n')
}

export function inferAgentFromMessage(message: string): ChimmyAgentType {
  const text = message.toLowerCase()

  const asksScheduleOrCalendar =
    /\b(when|where|what\s+date|what\s+time|what\s+day|how\s+long\s+until|is\s+the|schedule|calendar|what\s+week)\b/i.test(
      text
    )
  const mentionsRealSportsContext =
    /\b(nfl|nba|mlb|nhl|ncaa|college\s+football|college\s+basketball|soccer|mls|premier\s+league|champions\s+league|world\s+cup|fifa|march\s+madness|super\s*bowl|world\s+series|stanley\s+cup|playoffs?|bowl\s+game|combine|draft|game|match|kickoff)\b/i.test(
      text
    )
  const clearlyFantasyLeague =
    /\b(fantasy|my\s+league|dynasty\s+league|redraft|keeper\s+league|mock\s+draft|sleeper\s+league|faab|ppr|superflex|half\s+ppr)\b/i.test(
      text
    ) ||
    /\b(my|our)\s+(dynasty|fantasy|redraft|keeper)\b/.test(text) ||
    /\bdynasty\s+(startup|rookie\s+draft|league\s+draft)\b/.test(text)

  // Pro/college schedules, league draft dates, major events — not the fantasy draft assistant
  if (asksScheduleOrCalendar && mentionsRealSportsContext && !clearlyFantasyLeague) {
    return 'trade_analyzer'
  }

  if (/waiver|faab|add\/drop|add drop|claim/.test(text)) return 'waiver_wire'
  if (
    /mock\s+draft|\brookie\s+pick\b|\b(?:fantasy|dynasty|redraft|keeper)\s+draft\b|draft\s+pick|adp|draft\s+strategy|when\s+to\s+draft/.test(
      text
    ) ||
    (/\bdraft\b/.test(text) && !asksScheduleOrCalendar)
  ) {
    return 'draft_assistant'
  }
  if (/matchup|start\/sit|start sit|projection|win probability/.test(text)) return 'matchup_simulator'
  if (/compare|versus|vs\b|player comparison/.test(text)) return 'player_comparison'
  if (/power rank|ranking table|rankings/.test(text)) return 'power_rankings'
  if (/bracket|march madness|tournament/.test(text)) return 'bracket'
  if (/\bc2c\b|college to canton|campus to canton|college scoring|college roster/.test(text)) return 'c2c_specialist'
  if (/dynasty|legacy|window|rebuild|contend/.test(text)) return 'dynasty_legacy'
  if (/story|narrative|hype|recap|drama/.test(text)) return 'storyline'
  return 'trade_analyzer'
}
