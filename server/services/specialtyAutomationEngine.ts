/**
 * Specialty League Automation Engine — thin server facade for API/cron imports.
 */
export {
  runSpecialtyAutomationOrchestrator,
  type RunSpecialtyAutomationInput,
  type RunSpecialtyAutomationOutput,
} from '@/lib/specialty-automation/orchestrator'

export { dispatchSpecialtyAutomationTrigger } from '@/lib/specialty-automation/triggerDispatcher'
