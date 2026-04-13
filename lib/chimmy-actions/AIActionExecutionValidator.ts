import type { AIAction, AIActionContext, AIWorkflowPrefill, AIWorkflowType } from './AIActionModel'
import { applyAvailabilityToAction, evaluateAIActionDecision } from './AIActionPermissionGuard'
import { buildWorkflowPrefill } from './AIActionWorkflowPrefiller'

export interface WorkflowValidationIssue {
  code:
    | 'invalid_action'
    | 'missing_workflow_prefill'
    | 'invalid_workflow_type'
    | 'missing_field'
    | 'invalid_field_type'
    | 'permission_denied'
    | 'league_state_blocked'
    | 'scope_mismatch'
  message: string
  field?: string
}

export interface AIActionExecutionValidationResult {
  allowed: boolean
  issues: WorkflowValidationIssue[]
  normalizedAction: AIAction
  workflowPrefill: AIWorkflowPrefill | null
}

const REQUIRED_FIELDS_BY_WORKFLOW: Partial<Record<AIWorkflowType, string[]>> = {
  draft_pick: ['playerId'],
  auction_bid: ['playerId'],
  waiver_claim: ['playerId'],
  lineup_edit: [],
  trade_compose: ['targetTeamId'],
  trade_analysis: [],
  chat_compose: ['message'],
  roster_move: ['playerId'],
  league_discovery: [],
  simulation: [],
  announcement: [],
  deep_dive: [],
  saved_items: [],
  draft_queue: [],
  watchlist: [],
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validateCommonScope(
  action: AIAction,
  prefill: AIWorkflowPrefill,
): WorkflowValidationIssue[] {
  const issues: WorkflowValidationIssue[] = []

  if (action.leagueId && prefill.leagueId && action.leagueId !== prefill.leagueId) {
    issues.push({
      code: 'scope_mismatch',
      message: 'Workflow prefill leagueId does not match action scope.',
      field: 'leagueId',
    })
  }

  if (action.teamId && prefill.teamId && action.teamId !== prefill.teamId) {
    issues.push({
      code: 'scope_mismatch',
      message: 'Workflow prefill teamId does not match action scope.',
      field: 'teamId',
    })
  }

  return issues
}

function validateWorkflowPrefillShape(prefill: AIWorkflowPrefill): WorkflowValidationIssue[] {
  const issues: WorkflowValidationIssue[] = []
  if (!isRecord(prefill.values)) {
    issues.push({
      code: 'invalid_field_type',
      message: 'workflowPrefill.values must be an object.',
      field: 'values',
    })
    return issues
  }

  const requiredFields = REQUIRED_FIELDS_BY_WORKFLOW[prefill.workflowType] ?? []
  for (const field of requiredFields) {
    if (prefill.values[field] == null || prefill.values[field] === '') {
      issues.push({
        code: 'missing_field',
        message: `Missing required workflow prefill field: ${field}.`,
        field,
      })
    }
  }

  return issues
}

function validateWorkflowState(
  workflowType: AIWorkflowType,
  context: AIActionContext,
): WorkflowValidationIssue[] {
  const issues: WorkflowValidationIssue[] = []

  if (workflowType === 'waiver_claim' && !context.leagueState.isWaiverOpen) {
    issues.push({
      code: 'league_state_blocked',
      message: 'Waiver workflow is blocked because waivers are closed.',
    })
  }

  if ((workflowType === 'draft_pick' || workflowType === 'draft_queue' || workflowType === 'auction_bid') && !context.leagueState.isDraftActive) {
    issues.push({
      code: 'league_state_blocked',
      message: 'Draft workflow is blocked because the draft is not active.',
    })
  }

  if (workflowType === 'lineup_edit' && context.leagueState.isLineupLocked) {
    issues.push({
      code: 'league_state_blocked',
      message: 'Lineup workflow is blocked while lineup lock is active.',
    })
  }

  if (workflowType === 'trade_compose' && context.leagueState.isTradeDeadlinePast) {
    issues.push({
      code: 'league_state_blocked',
      message: 'Trade workflow is blocked because the trade deadline has passed.',
    })
  }

  return issues
}

export function validateActionExecution(
  action: AIAction,
  context: AIActionContext,
): AIActionExecutionValidationResult {
  const decision = evaluateAIActionDecision(action, context)
  const normalizedAction = applyAvailabilityToAction(action, context)
  const issues: WorkflowValidationIssue[] = []

  if (decision.status === 'blocked') {
    issues.push({
      code: decision.blockedBy === 'permissions' || decision.blockedBy === 'premium' || decision.blockedBy === 'commissioner_restriction'
        ? 'permission_denied'
        : decision.blockedBy === 'sport_rules' || decision.blockedBy === 'transaction_legality'
          ? 'invalid_action'
          : 'league_state_blocked',
      message: decision.reason ?? normalizedAction.disabledReason ?? 'Action is currently unavailable.',
    })
  }

  const workflowPrefill = normalizedAction.workflowPrefill ?? buildWorkflowPrefill(normalizedAction)

  if (!workflowPrefill) {
    issues.push({
      code: 'missing_workflow_prefill',
      message: 'Action is missing workflow prefill data.',
    })
  } else {
    issues.push(...validateCommonScope(normalizedAction, workflowPrefill))
    issues.push(...validateWorkflowPrefillShape(workflowPrefill))
    issues.push(...validateWorkflowState(workflowPrefill.workflowType, context))
  }

  return {
    allowed: issues.length === 0,
    issues,
    normalizedAction,
    workflowPrefill,
  }
}
