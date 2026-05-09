import { z } from "zod"

export const worldCupBracketSettingsPatchSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    visibility: z.enum(["public", "private"]).optional(),
    maxParticipants: z.number().int().min(1).max(100).optional(),
    maxEntriesPerParticipant: z.number().int().min(1).max(5).optional(),
    includeThirdPlace: z.boolean().optional(),
    scoringStyle: z.enum(["standard", "custom"]).optional(),
    scoring: z
      .object({
        roundOf32Points: z.number().positive().optional(),
        roundOf16Points: z.number().positive().optional(),
        quarterFinalPoints: z.number().positive().optional(),
        semiFinalPoints: z.number().positive().optional(),
        finalPoints: z.number().positive().optional(),
        championBonusPoints: z.number().positive().optional(),
        thirdPlacePoints: z.number().positive().nullable().optional(),
      })
      .optional(),
    tiebreakerFinalScore: z.boolean().optional(),
    allowLateJoin: z.boolean().optional(),
    showPublicPicks: z.enum(["after_lock", "never", "always"]).optional(),
    bracketBrainEnabled: z.boolean().optional(),
    /** Set new gate password, clear with empty string or null */
    joinPassword: z.union([z.string().min(1).max(64), z.literal("")]).nullable().optional(),
    commissioner: z
      .object({
        enableSystemEvents: z.boolean().optional(),
        enableUpsetAlerts: z.boolean().optional(),
        enableLeaderboardAlerts: z.boolean().optional(),
        enableChampionBustAlerts: z.boolean().optional(),
        enableLockReminders: z.boolean().optional(),
        enableAiSummaries: z.boolean().optional(),
      })
      .optional(),
  })
  .strict()

export type WorldCupBracketSettingsPatch = z.infer<typeof worldCupBracketSettingsPatchSchema>
