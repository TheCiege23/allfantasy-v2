/**
 * Mirrors client-side PWA registration gates: production builds always register;
 * local dev only when NEXT_PUBLIC_ENABLE_PWA_SW is set.
 */
export function shouldRegisterServiceWorker(): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  const flag = process.env.NEXT_PUBLIC_ENABLE_PWA_SW;
  return flag === '1' || flag === 'true';
}
