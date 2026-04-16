/** Draft types allowed in the redraft-only creation wizard + API. */
export const DRAFT_TYPES_REDRAFT = ['snake', 'linear', 'auction', 'offline', 'auto'] as const

export type RedraftDraftTypeId = (typeof DRAFT_TYPES_REDRAFT)[number]
