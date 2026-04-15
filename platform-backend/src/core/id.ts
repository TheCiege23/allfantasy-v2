export function newId(_prefix: string): string {
  return crypto.randomUUID()
}
