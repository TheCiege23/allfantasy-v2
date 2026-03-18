/**
 * Email Growth System (PROMPT 302).
 * Flows: weekly summaries, AI insights, league updates.
 */

export * from "./types"
export {
  sendWeeklySummaryEmail,
  getEligibleWeeklySummaryUserIds,
  runWeeklySummaryFlow,
} from "./flows/weeklySummaryEmail"
export { sendAIInsightEmail } from "./flows/aiInsightEmail"
export { sendLeagueUpdateEmail } from "./flows/leagueUpdateEmail"
export {
  buildWeeklySummaryHtml,
  buildAIInsightHtml,
  buildLeagueUpdateHtml,
} from "./templates"
export type {
  WeeklySummaryTemplateArgs,
  AIInsightTemplateArgs,
  LeagueUpdateTemplateArgs,
} from "./templates"
