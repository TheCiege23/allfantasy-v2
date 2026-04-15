import type {
  IRosterSportService,
  RosterSlotDefinition,
  RosterTemplateDefinition,
  SupportedRosterSport,
} from './RosterEngineTypes'

function makeNflService(): IRosterSportService {
  const roster = require('../nfl-roster') as typeof import('../nfl-roster')
  return {
    sport: 'NFL',
    async getConfig(leagueId) {
      const c = await roster.getLeagueNflRosterConfig(leagueId)
      return { templateKey: c.templateKey, slots: c.slots, isCustom: c.isCustom, lastUpdatedAt: c.lastUpdatedAt, lastUpdatedBy: c.lastUpdatedBy }
    },
    async saveConfig(leagueId, payload) {
      await roster.saveLeagueNflRosterConfig(leagueId, payload)
    },
    async applyDefaultOnCreate(leagueId, leagueType) {
      await roster.applyDefaultNflRosterOnCreate(leagueId, leagueType)
    },
    getSlots: () => roster.getAllNflSlots() as RosterSlotDefinition[],
    getTemplates: () => roster.NFL_ROSTER_TEMPLATES as RosterTemplateDefinition[],
    resolveDefaultTemplate(leagueType) {
      return roster.resolveNflRosterTemplate(leagueType) as RosterTemplateDefinition
    },
  }
}

function makeNbaService(): IRosterSportService {
  const roster = require('../nba-roster') as typeof import('../nba-roster')
  return {
    sport: 'NBA',
    async getConfig(leagueId) {
      const c = await roster.getLeagueNbaRosterConfig(leagueId)
      return { templateKey: c.templateKey, slots: c.slots, isCustom: c.isCustom, lastUpdatedAt: c.lastUpdatedAt, lastUpdatedBy: c.lastUpdatedBy }
    },
    async saveConfig(leagueId, payload) { await roster.saveLeagueNbaRosterConfig(leagueId, payload) },
    async applyDefaultOnCreate(leagueId, leagueType) { await roster.applyDefaultNbaRosterOnCreate(leagueId, leagueType) },
    getSlots: () => roster.getAllNbaSlots() as RosterSlotDefinition[],
    getTemplates: () => roster.NBA_ROSTER_TEMPLATES as RosterTemplateDefinition[],
    resolveDefaultTemplate: (leagueType) => roster.resolveNbaRosterTemplate(leagueType) as RosterTemplateDefinition,
  }
}

function makeNcaabService(): IRosterSportService {
  const roster = require('../ncaab-roster') as typeof import('../ncaab-roster')
  return {
    sport: 'NCAAB',
    async getConfig(leagueId) {
      const c = await roster.getLeagueNcaabRosterConfig(leagueId)
      return { templateKey: c.templateKey, slots: c.slots, isCustom: c.isCustom, lastUpdatedAt: c.lastUpdatedAt, lastUpdatedBy: c.lastUpdatedBy }
    },
    async saveConfig(leagueId, payload) { await roster.saveLeagueNcaabRosterConfig(leagueId, payload) },
    async applyDefaultOnCreate(leagueId, leagueType) { await roster.applyDefaultNcaabRosterOnCreate(leagueId, leagueType) },
    getSlots: () => roster.getAllNcaabSlots() as RosterSlotDefinition[],
    getTemplates: () => roster.NCAAB_ROSTER_TEMPLATES as RosterTemplateDefinition[],
    resolveDefaultTemplate: (leagueType) => roster.resolveNcaabRosterTemplate(leagueType) as RosterTemplateDefinition,
  }
}

function makeMlbService(): IRosterSportService {
  const roster = require('../mlb-roster') as typeof import('../mlb-roster')
  return {
    sport: 'MLB',
    async getConfig(leagueId) {
      const c = await roster.getLeagueMlbRosterConfig(leagueId)
      return { templateKey: c.templateKey, slots: c.slots, isCustom: c.isCustom, lastUpdatedAt: c.lastUpdatedAt, lastUpdatedBy: c.lastUpdatedBy }
    },
    async saveConfig(leagueId, payload) { await roster.saveLeagueMlbRosterConfig(leagueId, payload) },
    async applyDefaultOnCreate(leagueId, leagueType) { await roster.applyDefaultMlbRosterOnCreate(leagueId, leagueType) },
    getSlots: () => roster.getAllMlbSlots() as RosterSlotDefinition[],
    getTemplates: () => roster.MLB_ROSTER_TEMPLATES as RosterTemplateDefinition[],
    resolveDefaultTemplate: (leagueType) => roster.resolveMlbRosterTemplate(leagueType) as RosterTemplateDefinition,
  }
}

function makeNcaafService(): IRosterSportService {
  const roster = require('../ncaaf-roster') as typeof import('../ncaaf-roster')
  return {
    sport: 'NCAAF',
    async getConfig(leagueId) {
      const c = await roster.getLeagueNcaafRosterConfig(leagueId)
      return { templateKey: c.templateKey, slots: c.slots, isCustom: c.isCustom, lastUpdatedAt: c.lastUpdatedAt, lastUpdatedBy: c.lastUpdatedBy }
    },
    async saveConfig(leagueId, payload) { await roster.saveLeagueNcaafRosterConfig(leagueId, payload) },
    async applyDefaultOnCreate(leagueId, leagueType) { await roster.applyDefaultNcaafRosterOnCreate(leagueId, leagueType) },
    getSlots: () => roster.getAllNcaafSlots() as RosterSlotDefinition[],
    getTemplates: () => roster.NCAAF_ROSTER_TEMPLATES as RosterTemplateDefinition[],
    resolveDefaultTemplate: (leagueType) => roster.resolveNcaafRosterTemplate(leagueType) as RosterTemplateDefinition,
  }
}

function makeNhlService(): IRosterSportService {
  const roster = require('../nhl-roster') as typeof import('../nhl-roster')
  return {
    sport: 'NHL',
    async getConfig(leagueId) {
      const c = await roster.getLeagueNhlRosterConfig(leagueId)
      return { templateKey: c.templateKey, slots: c.slots, isCustom: c.isCustom, lastUpdatedAt: c.lastUpdatedAt, lastUpdatedBy: c.lastUpdatedBy }
    },
    async saveConfig(leagueId, payload) { await roster.saveLeagueNhlRosterConfig(leagueId, payload) },
    async applyDefaultOnCreate(leagueId, leagueType) { await roster.applyDefaultNhlRosterOnCreate(leagueId, leagueType) },
    getSlots: () => roster.getAllNhlSlots() as RosterSlotDefinition[],
    getTemplates: () => roster.NHL_ROSTER_TEMPLATES as RosterTemplateDefinition[],
    resolveDefaultTemplate: (leagueType) => roster.resolveNhlRosterTemplate(leagueType) as RosterTemplateDefinition,
  }
}

function makeSoccerService(): IRosterSportService {
  const roster = require('../soccer-roster') as typeof import('../soccer-roster')
  return {
    sport: 'SOCCER',
    async getConfig(leagueId) {
      const c = await roster.getLeagueSoccerRosterConfig(leagueId)
      return { templateKey: c.templateKey, slots: c.slots, isCustom: c.isCustom, lastUpdatedAt: c.lastUpdatedAt, lastUpdatedBy: c.lastUpdatedBy }
    },
    async saveConfig(leagueId, payload) { await roster.saveLeagueSoccerRosterConfig(leagueId, payload) },
    async applyDefaultOnCreate(leagueId, leagueType) { await roster.applyDefaultSoccerRosterOnCreate(leagueId, leagueType) },
    getSlots: () => roster.getAllSoccerSlots() as RosterSlotDefinition[],
    getTemplates: () => roster.SOCCER_ROSTER_TEMPLATES as RosterTemplateDefinition[],
    resolveDefaultTemplate: (leagueType) => roster.resolveSoccerRosterTemplate(leagueType) as RosterTemplateDefinition,
  }
}

class RosterEngineRegistry {
  private services = new Map<SupportedRosterSport, IRosterSportService>([
    ['NFL', makeNflService()],
    ['NCAAF', makeNcaafService()],
    ['NBA', makeNbaService()],
    ['NCAAB', makeNcaabService()],
    ['MLB', makeMlbService()],
    ['NHL', makeNhlService()],
    ['SOCCER', makeSoccerService()],
  ])

  getService(sport: string): IRosterSportService {
    const normalized = sport.toUpperCase() as SupportedRosterSport
    const service = this.services.get(normalized)
    if (!service) throw new Error(`Unsupported roster sport: ${sport}`)
    return service
  }

  isSupported(sport: string): boolean {
    return this.services.has(sport.toUpperCase() as SupportedRosterSport)
  }
}

let _registry: RosterEngineRegistry | null = null

export function getRosterEngineRegistry(): RosterEngineRegistry {
  if (!_registry) _registry = new RosterEngineRegistry()
  return _registry
}
