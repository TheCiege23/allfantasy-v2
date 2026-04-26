/**
 * D.6 dev-only preview at `/dev/d6-preview`. Must not render in production builds.
 * Single source of truth for the route guard and unit tests.
 */
export function isD6PreviewRouteEnabled(): boolean {
  return process.env.NODE_ENV !== 'production'
}
