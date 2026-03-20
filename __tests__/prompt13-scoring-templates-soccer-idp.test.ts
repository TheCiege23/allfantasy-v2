import { describe, expect, it } from 'vitest'
import {
  getDefaultScoringTemplate,
  resolveDefaultScoringTemplate,
  getDefaultScoringRules,
  getSupportedScoringFormats,
  getScoringContextForAI,
  SCORING_DEFAULTS_REGISTRY_VERSION,
} from '@/lib/scoring-defaults/ScoringDefaultsRegistry'
import {
  computeFantasyPoints,
  computeFantasyPointsWithBreakdown,
} from '@/lib/scoring-defaults/FantasyPointCalculator'

describe('Prompt 13 — Default Scoring Templates for Soccer + NFL IDP', () => {
  describe('Soccer Scoring Template Definitions', () => {
    it('provides soccer standard scoring template with expected stat keys', () => {
      const soccer = getDefaultScoringTemplate('SOCCER', 'standard')

      expect(soccer.sportType).toBe('SOCCER')
      expect(soccer.formatType).toBe('standard')
      expect(soccer.templateId).toBe('default-SOCCER-standard')
      expect(soccer.name).toContain('Soccer')

      const statKeys = soccer.rules.map((r) => r.statKey)
      expect(statKeys).toContain('goal')
      expect(statKeys).toContain('assist')
      expect(statKeys).toContain('shot_on_target')
      expect(statKeys).toContain('shot')
      expect(statKeys).toContain('key_pass')
      expect(statKeys).toContain('clean_sheet')
      expect(statKeys).toContain('goal_allowed')
      expect(statKeys).toContain('save')
      expect(statKeys).toContain('penalty_save')
      expect(statKeys).toContain('penalty_miss')
      expect(statKeys).toContain('yellow_card')
      expect(statKeys).toContain('red_card')
      expect(statKeys).toContain('own_goal')
      expect(statKeys).toContain('minutes_played')
    })

    it('defines soccer stat point values with positive for good plays', () => {
      const soccer = getDefaultScoringTemplate('SOCCER', 'standard')

      const goalRule = soccer.rules.find((r) => r.statKey === 'goal')
      expect(goalRule?.pointsValue).toBe(6)
      expect(goalRule?.enabled).toBe(true)

      const assistRule = soccer.rules.find((r) => r.statKey === 'assist')
      expect(assistRule?.pointsValue).toBe(3)

      const shotRule = soccer.rules.find((r) => r.statKey === 'shot')
      expect(shotRule?.pointsValue).toBeGreaterThan(0)

      const cleanSheetRule = soccer.rules.find((r) => r.statKey === 'clean_sheet')
      expect(cleanSheetRule?.pointsValue).toBeGreaterThan(0)
    })

    it('defines soccer defensive penalties with negative points', () => {
      const soccer = getDefaultScoringTemplate('SOCCER', 'standard')

      const goalAllowedRule = soccer.rules.find((r) => r.statKey === 'goal_allowed')
      expect(goalAllowedRule?.pointsValue).toBeLessThan(0)

      const redCardRule = soccer.rules.find((r) => r.statKey === 'red_card')
      expect(redCardRule?.pointsValue).toBeLessThan(0)

      const ownGoalRule = soccer.rules.find((r) => r.statKey === 'own_goal')
      expect(ownGoalRule?.pointsValue).toBeLessThan(0)

      const penaltyMissRule = soccer.rules.find((r) => r.statKey === 'penalty_miss')
      expect(penaltyMissRule?.pointsValue).toBeLessThan(0)
    })

    it('soccer rules include minutes played for per-match value', () => {
      const soccer = getDefaultScoringTemplate('SOCCER', 'standard')

      const minutesRule = soccer.rules.find((r) => r.statKey === 'minutes_played')
      expect(minutesRule).toBeDefined()
      expect(minutesRule?.pointsValue).toBeGreaterThan(0)
      expect(minutesRule?.enabled).toBe(true)
    })

    it('soccer template includes all 14 stat keys', () => {
      const soccer = getDefaultScoringTemplate('SOCCER', 'standard')

      const expectedKeys = [
        'goal',
        'assist',
        'shot_on_target',
        'shot',
        'key_pass',
        'clean_sheet',
        'goal_allowed',
        'save',
        'penalty_save',
        'penalty_miss',
        'yellow_card',
        'red_card',
        'own_goal',
        'minutes_played',
      ]

      const actual = soccer.rules.map((r) => r.statKey)
      expect(actual).toEqual(expect.arrayContaining(expectedKeys))
    })

    it('soccer only format is standard', () => {
      const formats = getSupportedScoringFormats('SOCCER')
      expect(formats).toEqual(['standard'])
    })
  })

  describe('Soccer Scoring Calculation', () => {
    it('calculates fantasy points for striker with goal and assists', () => {
      const rules = getDefaultScoringTemplate('SOCCER', 'standard').rules
      const stats = {
        goal: 2,
        assist: 1,
        shot_on_target: 4,
        shot: 8,
        key_pass: 3,
        minutes_played: 90,
      }

      const points = computeFantasyPoints(stats, rules)

      // 2 goals * 6 + 1 assist * 3 + 4 SOT * 0.5 + 8 shots * 0.2 + 3 key pass * 0.5 + 90 min * 0.02
      // = 12 + 3 + 2 + 1.6 + 1.5 + 1.8 = 21.9
      expect(points).toBeGreaterThan(20)
      expect(points).toBeLessThan(23)
    })

    it('calculates fantasy points for defender with clean sheet and pass defended', () => {
      const rules = getDefaultScoringTemplate('SOCCER', 'standard').rules
      const stats = {
        clean_sheet: 1,
        shot_on_target: 1,
        key_pass: 2,
        yellow_card: 0,
        minutes_played: 90,
      }

      const points = computeFantasyPoints(stats, rules)

      // 1 clean sheet * 4 + 1 SOT * 0.5 + 2 key pass * 0.5 + 90 min * 0.02
      // = 4 + 0.5 + 1 + 1.8 = 7.3
      expect(points).toBeGreaterThan(6)
      expect(points).toBeLessThan(8)
    })

    it('calculates fantasy points for goalkeeper with saves and clean sheet', () => {
      const rules = getDefaultScoringTemplate('SOCCER', 'standard').rules
      const stats = {
        save: 5,
        clean_sheet: 1,
        penalty_save: 0,
        minutes_played: 90,
        goal_allowed: 0,
      }

      const points = computeFantasyPoints(stats, rules)

      // 5 saves * 0.5 + 1 clean sheet * 4 + 90 min * 0.02
      // = 2.5 + 4 + 1.8 = 8.3
      expect(points).toBeGreaterThan(7)
      expect(points).toBeLessThan(10)
    })

    it('applies penalties for red card and own goal', () => {
      const rules = getDefaultScoringTemplate('SOCCER', 'standard').rules
      const badStats = {
        red_card: 1,
        own_goal: 1,
        goal_allowed: 2,
        minutes_played: 45,
      }

      const points = computeFantasyPoints(badStats, rules)

      // With all the negative values, total should be negative or near zero
      expect(points).toBeLessThan(5)
    })

    it('provides breakdown of fantasy points by stat for soccer', () => {
      const rules = getDefaultScoringTemplate('SOCCER', 'standard').rules
      const stats = {
        goal: 1,
        assist: 1,
        shot_on_target: 2,
        minutes_played: 90,
      }

      const result = computeFantasyPointsWithBreakdown(stats, rules)

      expect(result.breakdown.goal).toBe(6) // 1 * 6
      expect(result.breakdown.assist).toBe(3) // 1 * 3
      expect(result.breakdown.shot_on_target).toBe(1) // 2 * 0.5
      expect(result.breakdown.minutes_played).toBeGreaterThan(1.5)
      expect(result.total).toBeGreaterThan(0)
    })
  })

  describe('NFL IDP Scoring Template Definitions', () => {
    it('provides IDP balanced scoring template with offensive and defensive rules', () => {
      const idp = getDefaultScoringTemplate('NFL', 'IDP')

      expect(idp.sportType).toBe('NFL')
      expect(idp.formatType).toBe('IDP')
      expect(idp.name).toContain('IDP')
      expect(idp.rules.length).toBeGreaterThan(40)
    })

    it('includes offensive scoring in IDP template', () => {
      const idp = getDefaultScoringTemplate('NFL', 'IDP')
      const statKeys = idp.rules.map((r) => r.statKey)

      expect(statKeys).toContain('passing_yards')
      expect(statKeys).toContain('passing_td')
      expect(statKeys).toContain('rushing_yards')
      expect(statKeys).toContain('rushing_td')
      expect(statKeys).toContain('receptions')
      expect(statKeys).toContain('receiving_yards')
      expect(statKeys).toContain('receiving_td')
      expect(statKeys).toContain('fumble_lost')
    })

    it('includes all defensive scoring stat keys', () => {
      const idp = getDefaultScoringTemplate('NFL', 'IDP')
      const statKeys = idp.rules.map((r) => r.statKey)

      const defenseKeys = [
        'idp_solo_tackle',
        'idp_assist_tackle',
        'idp_tackle_for_loss',
        'idp_qb_hit',
        'idp_sack',
        'idp_interception',
        'idp_pass_defended',
        'idp_forced_fumble',
        'idp_fumble_recovery',
        'idp_defensive_touchdown',
        'idp_safety',
      ]

      expect(statKeys).toEqual(expect.arrayContaining(defenseKeys))
    })

    it('defines IDP tackle scoring lower than big plays', () => {
      const idp = getDefaultScoringTemplate('NFL', 'IDP')

      const tackleRule = idp.rules.find((r) => r.statKey === 'idp_solo_tackle')
      const sackRule = idp.rules.find((r) => r.statKey === 'idp_sack')
      const intRule = idp.rules.find((r) => r.statKey === 'idp_interception')

      expect(sackRule!.pointsValue).toBeGreaterThan(tackleRule!.pointsValue)
      expect(intRule!.pointsValue).toBeGreaterThan(tackleRule!.pointsValue)
    })

    it('supports IDP tackle-heavy preset', () => {
      const tacleHeavy = getDefaultScoringTemplate('NFL', 'IDP-tackle_heavy')

      const tackleRule = tacleHeavy.rules.find((r) => r.statKey === 'idp_solo_tackle')
      const sackRule = tacleHeavy.rules.find((r) => r.statKey === 'idp_sack')

      expect(tackleRule!.pointsValue).toBeGreaterThan(1)
      expect(sackRule!.pointsValue).toBeLessThan(4)
    })

    it('supports IDP big-play-heavy preset', () => {
      const bigPlay = getDefaultScoringTemplate('NFL', 'IDP-big_play_heavy')

      const tackleRule = bigPlay.rules.find((r) => r.statKey === 'idp_solo_tackle')
      const sackRule = bigPlay.rules.find((r) => r.statKey === 'idp_sack')
      const ffRule = bigPlay.rules.find((r) => r.statKey === 'idp_forced_fumble')

      expect(sackRule!.pointsValue).toBeGreaterThan(4)
      expect(ffRule!.pointsValue).toBeGreaterThan(3)
      expect(tackleRule!.pointsValue).toBeLessThan(1)
    })

    it('IDP supports multiple format options', () => {
      const formats = getSupportedScoringFormats('NFL')

      expect(formats).toContain('IDP')
      expect(formats).toContain('IDP-balanced')
      expect(formats).toContain('IDP-tackle_heavy')
      expect(formats).toContain('IDP-big_play_heavy')
      expect(formats).toContain('PPR')
      expect(formats).toContain('standard')
    })

    it('IDP includes both offensive and defensive scoring rules', () => {
      const idp = getDefaultScoringTemplate('NFL', 'IDP')
      const statKeys = idp.rules.map((r) => r.statKey)

      // IDP includes offensive stats
      expect(statKeys).toContain('passing_yards')
      expect(statKeys).toContain('rushing_td')
      // IDP includes defensive player stats
      expect(statKeys).toContain('idp_sack')
      expect(statKeys).toContain('idp_solo_tackle')
    })
  })

  describe('NFL IDP Scoring Calculation', () => {
    it('calculates offensive + defensive points for IDP league', () => {
      const rules = getDefaultScoringTemplate('NFL', 'IDP').rules
      const stats = {
        // Offensive
        passing_yards: 300,
        passing_td: 2,
        interception: 1,
        // Defensive
        idp_solo_tackle: 8,
        idp_assist_tackle: 4,
        idp_sack: 2,
        idp_interception: 1,
      }

      const points = computeFantasyPoints(stats, rules)

      // Offensive: 300*0.04 + 2*4 - 1*2 = 12 + 8 - 2 = 18
      // Defensive: 8*1 + 4*0.5 + 2*4 + 1*3 = 8 + 2 + 8 + 3 = 21
      // Total ~= 39
      expect(points).toBeGreaterThan(35)
      expect(points).toBeLessThan(45)
    })

    it('calculates defensive player points with balanced IDP preset', () => {
      const rules = getDefaultScoringTemplate('NFL', 'IDP-balanced').rules
      const stats = {
        idp_solo_tackle: 10,
        idp_assist_tackle: 8,
        idp_sack: 3,
        idp_interception: 2,
        idp_forced_fumble: 1,
        idp_fumble_recovery: 1,
      }

      const points = computeFantasyPoints(stats, rules)

      // 10*1 + 8*0.5 + 3*4 + 2*3 + 1*3 + 1*2 = 10 + 4 + 12 + 6 + 3 + 2 = 37
      expect(points).toBeGreaterThan(35)
      expect(points).toBeLessThan(40)
    })

    it('calculates defensive player points with tackle-heavy IDP preset', () => {
      const rules = getDefaultScoringTemplate('NFL', 'IDP-tackle_heavy').rules
      const stats = {
        idp_solo_tackle: 12,
        idp_assist_tackle: 10,
        idp_sack: 1,
        idp_interception: 0,
      }

      const points = computeFantasyPoints(stats, rules)

      // 12*1.5 + 10*0.75 + 1*3 = 18 + 7.5 + 3 = 28.5
      expect(points).toBeGreaterThan(27)
      expect(points).toBeLessThan(30)
    })

    it('calculates defensive player points with big-play-heavy IDP preset', () => {
      const rules = getDefaultScoringTemplate('NFL', 'IDP-big_play_heavy').rules
      const stats = {
        idp_solo_tackle: 5,
        idp_assist_tackle: 3,
        idp_sack: 4,
        idp_interception: 2,
        idp_forced_fumble: 2,
      }

      const points = computeFantasyPoints(stats, rules)

      // 5*0.5 + 3*0.25 + 4*5 + 2*5 + 2*4 = 2.5 + 0.75 + 20 + 10 + 8 = 41.25
      expect(points).toBeGreaterThan(40)
      expect(points).toBeLessThan(45)
    })

    it('provides per-stat breakdown for IDP scoring', () => {
      const rules = getDefaultScoringTemplate('NFL', 'IDP').rules
      const stats = {
        idp_solo_tackle: 5,
        idp_sack: 2,
        idp_interception: 1,
      }

      const result = computeFantasyPointsWithBreakdown(stats, rules)

      expect(result.breakdown.idp_solo_tackle).toBe(5) // 5 * 1
      expect(result.breakdown.idp_sack).toBe(8) // 2 * 4
      expect(result.breakdown.idp_interception).toBe(3) // 1 * 3
      expect(result.total).toBe(16)
    })
  })

  describe('Variant Resolution for IDP Scoring', () => {
    it('resolves IDP variant to IDP-balanced format by default', () => {
      const template = resolveDefaultScoringTemplate('NFL', {
        leagueSettings: { leagueVariant: 'IDP' },
      })

      expect(template.formatType).toBe('IDP-balanced')
      expect(template.rules.some((r) => r.statKey === 'idp_sack')).toBe(true)
    })

    it('resolves DYNASTY_IDP variant to IDP-balanced format by default', () => {
      const template = resolveDefaultScoringTemplate('NFL', {
        leagueSettings: { leagueVariant: 'DYNASTY_IDP' },
      })

      expect(template.formatType).toBe('IDP-balanced')
      expect(template.rules.some((r) => r.statKey === 'idp_solo_tackle')).toBe(true)
    })

    it('resolves IDP with tackle_heavy preset', () => {
      const template = resolveDefaultScoringTemplate('NFL', {
        leagueSettings: {
          leagueVariant: 'IDP',
          idpScoringPreset: 'tackle_heavy',
        },
      })

      expect(template.formatType).toBe('IDP-tackle_heavy')
      
      const tackleRule = template.rules.find((r) => r.statKey === 'idp_solo_tackle')
      expect(tackleRule!.pointsValue).toBeGreaterThan(1.2)
    })

    it('resolves IDP with big_play_heavy preset', () => {
      const template = resolveDefaultScoringTemplate('NFL', {
        leagueSettings: {
          leagueVariant: 'DYNASTY_IDP',
          idpScoringPreset: 'big_play_heavy',
        },
      })

      expect(template.formatType).toBe('IDP-big_play_heavy')
      
      const sackRule = template.rules.find((r) => r.statKey === 'idp_sack')
      expect(sackRule!.pointsValue).toBeGreaterThan(4)
    })

    it('resolves explicit IDP formatType directly', () => {
      const template = resolveDefaultScoringTemplate('NFL', {
        formatType: 'IDP-tackle_heavy',
      })

      expect(template.formatType).toBe('IDP-tackle_heavy')
    })

    it('resolves Soccer uses standard format when no variant', () => {
      const template = resolveDefaultScoringTemplate('SOCCER', {
        leagueSettings: null,
      })

      expect(template.formatType).toBe('standard')
      expect(template.rules.some((r) => r.statKey === 'goal')).toBe(true)
    })

    it('Soccer does not support IDP variant', () => {
      const template = resolveDefaultScoringTemplate('SOCCER', {
        leagueSettings: { leagueVariant: 'IDP' },
      })

      // Should fall back to Soccer standard
      expect(template.formatType).toBe('standard')
      expect(template.rules.some((r) => r.statKey === 'goal')).toBe(true)
    })
  })

  describe('AI Context Strings', () => {
    it('generates scoring context string for Soccer', () => {
      const context = getScoringContextForAI('SOCCER', 'standard')

      expect(context).toContain('Scoring:')
      expect(context).toContain('Soccer')
      expect(context).toContain('goal')
      expect(context).toContain('assist')
    })

    it('generates scoring context string for IDP', () => {
      const context = getScoringContextForAI('NFL', 'IDP')

      expect(context).toContain('Scoring:')
      expect(context).toContain('IDP')
      // Context includes offensive stats
      expect(context).toContain('passing_yards')
    })

    it('context string includes point values for key stats', () => {
      const context = getScoringContextForAI('SOCCER', 'standard')

      // Should have format like "goal: +6, assist: +3, ..."
      expect(context).toMatch(/goal.*[0-9]/)
      expect(context).toMatch(/assist.*[0-9]/)
    })
  })

  describe('Default Scoring Rules Access', () => {
    it('can get default scoring rules for Soccer', () => {
      const rules = getDefaultScoringRules('SOCCER', 'standard')

      expect(Array.isArray(rules)).toBe(true)
      expect(rules.length).toBeGreaterThan(10)
      expect(rules.some((r) => r.statKey === 'goal')).toBe(true)
    })

    it('can get default scoring rules for IDP', () => {
      const rules = getDefaultScoringRules('NFL', 'IDP')

      expect(Array.isArray(rules)).toBe(true)
      expect(rules.length).toBeGreaterThan(40)
      expect(rules.some((r) => r.statKey === 'idp_sack')).toBe(true)
    })

    it('rules have consistent structure across sports', () => {
      const soccerRules = getDefaultScoringRules('SOCCER')
      const idpRules = getDefaultScoringRules('NFL', 'IDP')

      for (const rule of soccerRules) {
        expect(rule).toHaveProperty('statKey')
        expect(rule).toHaveProperty('pointsValue')
        expect(rule).toHaveProperty('multiplier')
        expect(rule).toHaveProperty('enabled')
      }

      for (const rule of idpRules) {
        expect(rule).toHaveProperty('statKey')
        expect(rule).toHaveProperty('pointsValue')
        expect(rule).toHaveProperty('multiplier')
        expect(rule).toHaveProperty('enabled')
      }
    })
  })

  describe('Scoring Template Integration', () => {
    it('soccer template is fully functional for live scoring scenario', () => {
      const template = getDefaultScoringTemplate('SOCCER', 'standard')
      const playerStats = {
        goal: 1,
        assist: 1,
        shot_on_target: 3,
        key_pass: 2,
        minutes_played: 90,
      }

      const result = computeFantasyPointsWithBreakdown(playerStats, template.rules)

      expect(result.total).toBeGreaterThan(0)
      expect(Object.keys(result.breakdown).length).toBeGreaterThan(0)
      expect(result.breakdown.goal).toBeGreaterThan(0)
    })

    it('IDP template is fully functional for defender scenario', () => {
      const template = getDefaultScoringTemplate('NFL', 'IDP')
      const defenderStats = {
        idp_solo_tackle: 5,
        idp_assist_tackle: 3,
        idp_sack: 1,
        idp_interception: 1,
      }

      const result = computeFantasyPointsWithBreakdown(defenderStats, template.rules)

      expect(result.total).toBeGreaterThan(0)
      expect(result.breakdown.idp_solo_tackle).toBe(5)
      expect(result.breakdown.idp_sack).toBe(4)
    })

    it('IDP template supports both offensive and defensive players', () => {
      const template = getDefaultScoringTemplate('NFL', 'IDP')

      // QB stats
      const qbStats = { passing_yards: 250, passing_td: 1 }
      const qbPoints = computeFantasyPoints(qbStats, template.rules)
      expect(qbPoints).toBeGreaterThan(0)

      // Edge rusher stats
      const edgeStats = { idp_sack: 2, idp_tackle_for_loss: 1 }
      const edgePoints = computeFantasyPoints(edgeStats, template.rules)
      expect(edgePoints).toBeGreaterThan(0)

      // Both are positive and different
      expect(qbPoints).not.toBe(edgePoints)
    })
  })

  describe('Scoring System Compliance', () => {
    it('all Soccer and IDP stat keys are canonical (no spaces or special chars)', () => {
      const soccerRules = getDefaultScoringRules('SOCCER')
      const idpRules = getDefaultScoringRules('NFL', 'IDP')

      const allRules = [...soccerRules, ...idpRules]
      for (const rule of allRules) {
        // Keys should be lowercase, underscores, and numbers allowed for suffixes
        expect(rule.statKey).toMatch(/^[a-z0-9_]+$/)
      }
    })

    it('all scoring rules have valid point values', () => {
      const soccerRules = getDefaultScoringRules('SOCCER')
      const idpRules = getDefaultScoringRules('NFL', 'IDP')

      const allRules = [...soccerRules, ...idpRules]
      for (const rule of allRules) {
        expect(typeof rule.pointsValue).toBe('number')
        expect(isFinite(rule.pointsValue)).toBe(true)
        expect(rule.multiplier).toBeGreaterThan(0)
      }
    })

    it('all rules have enabled flag', () => {
      const soccerRules = getDefaultScoringRules('SOCCER')
      const idpRules = getDefaultScoringRules('NFL', 'IDP')

      const allRules = [...soccerRules, ...idpRules]
      for (const rule of allRules) {
        expect(typeof rule.enabled).toBe('boolean')
      }
    })

    it('registry version is defined', () => {
      expect(typeof SCORING_DEFAULTS_REGISTRY_VERSION).toBe('string')
      expect(SCORING_DEFAULTS_REGISTRY_VERSION.length).toBeGreaterThan(0)
    })
  })

  describe('Edge Cases and Fallbacks', () => {
    it('unknown format returns template with requested format type', () => {
      const template = getDefaultScoringTemplate('SOCCER', 'unknown_format')

      // Unknown formats are returned as requested (no fallback in this case)
      expect(template.formatType).toBe('unknown_format')
      // But rules still get populated from the registry
      expect(template.rules.length).toBeGreaterThan(0)
    })

    it('zero stats result in zero points', () => {
      const rules = getDefaultScoringTemplate('SOCCER', 'standard').rules
      const zeroStats = {}

      const points = computeFantasyPoints(zeroStats, rules)
      expect(points).toBe(0)
    })

    it('disabled rules do not contribute to points', () => {
      const rules = getDefaultScoringTemplate('SOCCER', 'standard').rules
      const disabledGoalRule = rules.map((r) =>
        r.statKey === 'goal' ? { ...r, enabled: false } : r
      )
      const stats = { goal: 5, assist: 2 }

      const pointsWithGoal = computeFantasyPoints(stats, rules)
      const pointsWithoutGoal = computeFantasyPoints(stats, disabledGoalRule)

      // Without goal scoring, should be significantly less
      expect(pointsWithGoal).toBeGreaterThan(pointsWithoutGoal + 20)
    })

    it('unknown stat keys are ignored gracefully', () => {
      const rules = getDefaultScoringTemplate('NFL', 'IDP').rules
      const statsWithUnknown = {
        idp_solo_tackle: 5,
        unknown_stat: 100, // This should be ignored
        idp_sack: 1,
      }

      const points = computeFantasyPoints(statsWithUnknown, rules)

      // Should only count tackles and sack, not unknown stat
      // 5*1 + 1*4 = 9
      expect(points).toBe(9)
    })
  })
})
