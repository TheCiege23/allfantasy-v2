/**
 * Run the same production build as `npm run build`, but force `distDir` to
 * `.next` (Vercel-style) for one-off diagnosis on Windows / odd cache issues.
 */
process.env.AF_NEXT_DIST_DIR = '.next'
require('./vercel-next-build.cjs')
