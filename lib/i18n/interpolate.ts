/**
 * Replace `{{key}}` placeholders in translation strings from `t()`.
 */
export function interpolateTemplate(
  template: string,
  vars: Record<string, string | number | undefined>,
): string {
  let s = template
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) continue
    s = s.split(`{{${k}}}`).join(String(v))
  }
  return s
}
