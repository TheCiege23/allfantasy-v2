/**
 * SMS Engagement System (PROMPT 303).
 * Critical alerts: draft, trade, matchup reminders.
 * Uses Twilio + notification preferences (SMS when phone verified and category SMS on).
 */

export * from "./types"
export {
  buildDraftAlertMessage,
  buildTradeAlertMessage,
  buildMatchupReminderMessage,
  buildDraftAlertSmsText,
  buildTradeAlertSmsText,
  buildMatchupReminderSmsText,
} from "./messages"
export {
  sendDraftAlert,
  sendTradeAlert,
  sendMatchupReminder,
} from "./sendAlerts"
export type {
  SendDraftAlertOptions,
  SendTradeAlertOptions,
  SendMatchupReminderOptions,
} from "./sendAlerts"
export { sendCriticalSms, sendCriticalSmsToUsers } from "./sendCriticalSms"
