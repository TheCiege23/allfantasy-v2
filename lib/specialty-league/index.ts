/**
 * Specialty League Factory — reusable architecture for AllFantasy specialty league types.
 * PROMPT 336.
 *
 * Use: getSpecialtySpecByVariant(league.leagueVariant), getSpecialtySpecByWizardType(leagueType),
 * then spec.detect(leagueId), spec.getConfig(leagueId), spec.rosterGuard?, etc.
 */

export * from './types'
export {
  registerSpecialtyLeague,
  getSpecialtySpec,
  getSpecialtySpecByVariant,
  getSpecialtySpecByWizardType,
  listSpecialtyLeagueIds,
  listSpecialtySpecs,
} from './registry'
export {
  getSpecialtyBootstrapForCreate,
  bootstrapSpecialtyConfig,
} from './league-create'
export type { SpecialtyBootstrapResult } from './league-create'
export {
  SALARY_CAP_DETERMINISTIC_FEATURES,
  SALARY_CAP_AI_OPTIONAL_FEATURES,
  SALARY_CAP_HYBRID_FEATURES,
  isSalaryCapDeterministicFeature,
  isSalaryCapAIOptionalFeature,
  SPECIALTY_LEAGUE_POLICY_RULE,
  SURVIVOR_DETERMINISTIC_FEATURES,
  SURVIVOR_AI_OPTIONAL_FEATURES,
  SURVIVOR_HYBRID_FEATURES,
  isSurvivorDeterministicFeature,
  isSurvivorAIOptionalFeature,
} from './automation-ai-policy'
export type {
  SalaryCapDeterministicFeatureId,
  SalaryCapAIOptionalFeatureId,
  SurvivorDeterministicFeatureId,
  SurvivorAIOptionalFeatureId,
} from './automation-ai-policy'
export {
  DETERMINISTIC_ENGINE_CATEGORIES,
  AUTOMATION_CATEGORIES,
  AI_CATEGORIES,
  SPORTS_API_REQUIREMENTS,
  QA_TEMPLATE_SECTIONS,
} from './framework-categories'
export type {
  DeterministicEngineCategory,
  AutomationCategory,
  AICategory,
  SportsAPIRequirement,
  QATemplateSection,
} from './framework-categories'
