import { z } from "zod"
import { requireWorldCupApiUser } from "../world-cup/_utils"

export { requireWorldCupApiUser }

export const playoffChallengeParamsSchema = z.object({
  challengeId: z.string().min(1),
})

export const playoffEntryParamsSchema = z.object({
  challengeId: z.string().min(1),
  entryId: z.string().min(1),
})
