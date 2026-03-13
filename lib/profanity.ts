const PROFANE_SUBSTRINGS = [
  "fuck",
  "shit",
  "bitch",
  "cunt",
  "asshole",
  "nigger",
  "fag",
  "slut",
  "whore",
]

export function containsProfanity(value: string): boolean {
  const v = value.toLowerCase()
  return PROFANE_SUBSTRINGS.some((w) => v.includes(w))
}

