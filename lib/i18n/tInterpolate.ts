import { interpolateTemplate } from "./interpolate";

export type InterpolationVars = Record<string, string | number | undefined>;

/**
 * Resolve a dictionary key with `t`, then replace `{{name}}` placeholders.
 * Use with `useLanguage().tInterpolate` in React, or pass any `t` (e.g. server-side lookup).
 */
export function tInterpolate(
  t: (key: string) => string,
  key: string,
  vars: InterpolationVars = {},
): string {
  return interpolateTemplate(t(key), vars);
}
