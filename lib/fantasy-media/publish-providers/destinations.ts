export const FANTASY_MEDIA_DESTINATIONS = [
  "x",
  "youtube",
  "facebook",
  "instagram",
  "tiktok",
  "discord",
] as const

export type FantasyMediaDestinationType = (typeof FANTASY_MEDIA_DESTINATIONS)[number]
