/**
 * Seed default marketplace items (cosmetic only). Safe to run multiple times; only inserts if none exist.
 */

import { prisma } from '@/lib/prisma'

const DEFAULTS = [
  { itemType: 'cosmetic_profile_frame', itemName: 'Bronze Frame', description: 'Bronze profile border', price: 50, sportRestriction: null, cosmeticCategory: 'profile_frame' },
  { itemType: 'cosmetic_profile_frame', itemName: 'Silver Frame', description: 'Silver profile border', price: 100, sportRestriction: null, cosmeticCategory: 'profile_frame' },
  { itemType: 'cosmetic_profile_frame', itemName: 'Gold Frame', description: 'Gold profile border', price: 200, sportRestriction: null, cosmeticCategory: 'profile_frame' },
  { itemType: 'cosmetic_league_trophy', itemName: 'Champion Trophy', description: 'Display trophy on profile', price: 150, sportRestriction: null, cosmeticCategory: 'league_trophy' },
  { itemType: 'cosmetic_draft_skin', itemName: 'Classic Draft Board', description: 'Classic draft board skin', price: 75, sportRestriction: null, cosmeticCategory: 'draft_board_skin' },
  { itemType: 'cosmetic_avatar', itemName: 'Star Badge', description: 'Star avatar badge', price: 25, sportRestriction: null, cosmeticCategory: 'avatar_item' },
  { itemType: 'cosmetic_banner', itemName: 'Season Champion Banner', description: 'Historical champion banner', price: 300, sportRestriction: null, cosmeticCategory: 'historical_banner' },
  { itemType: 'cosmetic_team_upgrade', itemName: 'Team Logo Glow', description: 'Cosmetic team logo effect', price: 80, sportRestriction: null, cosmeticCategory: 'team_upgrade' },
]

export async function seedDefaultMarketplaceItems(): Promise<number> {
  const count = await prisma.marketplaceItem.count()
  if (count > 0) return 0
  await prisma.marketplaceItem.createMany({
    data: DEFAULTS,
  })
  return DEFAULTS.length
}
