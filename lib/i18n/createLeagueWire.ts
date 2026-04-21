import type { DraftTypeOption } from '@/lib/create-league-v2/rules-engine'

/**
 * Localize draft type rows from the rules engine using keys
 * `createLeague.draftType.<id>.label` / `.hint`. Falls back to engine copy if missing.
 */
export function localizeDraftTypeOption(
  t: (key: string) => string,
  opt: DraftTypeOption,
): DraftTypeOption {
  const id = String(opt.id).trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
  const labelKey = `createLeague.draftType.${id}.label`
  const hintKey = `createLeague.draftType.${id}.hint`
  const tl = t(labelKey)
  const th = t(hintKey)
  return {
    ...opt,
    label: tl === labelKey ? opt.label : tl,
    hint: th === hintKey ? opt.hint : th,
  }
}
