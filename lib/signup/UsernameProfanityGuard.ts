import { containsProfanity } from "@/lib/profanity"

export function hasProfanityInUsername(username: string): boolean {
  return containsProfanity(username)
}
