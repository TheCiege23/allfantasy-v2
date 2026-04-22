/**
 * Idempotent catalog sync — run from API when assigning first bot.
 */

import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { BOT_PROFILES } from "./botProfiles"

export async function ensureBotProfilesSeeded(): Promise<void> {
  for (const p of BOT_PROFILES) {
    const tendencies = p.tendencies as unknown as Prisma.InputJsonValue
    await prisma.aiOpponentProfile.upsert({
      where: { botId: p.botId },
      create: {
        botId: p.botId,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        archetypeId: p.archetypeId,
        tendencies,
      },
      update: {
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        archetypeId: p.archetypeId,
        tendencies,
      },
    })
  }
}
