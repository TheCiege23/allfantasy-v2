/**
 * Railway Tailwind CSS prebuild script.
 *
 * Problem: On Railway (Node 22 Linux / Docker), the tailwindcss PostCSS plugin
 * sometimes silently produces 0 bytes of CSS when run inside webpack workers —
 * either due to a stale postcss-loader disk cache or ESM-package loading issues
 * in the worker context.  The result is that mini-css-extract-plugin has nothing
 * to extract, app-build-manifest.json lists no CSS for /layout, and every page
 * is completely unstyled.
 *
 * Fix: run the Tailwind CLI as a *separate process* BEFORE `next build`.  The CLI
 * reads app/globals.css (which contains @tailwind base/components/utilities),
 * scans all content files, and writes the compiled CSS back to app/globals.css.
 * When webpack subsequently processes globals.css it sees plain CSS (no @tailwind
 * directives), so postcss-loader's tailwindcss plugin is a no-op, autoprefixer
 * adds vendor prefixes, and mini-css-extract creates the correct CSS chunk.
 *
 * This script is wired up as the npm `prebuild` lifecycle hook in package.json,
 * so it runs automatically before `next build` regardless of what the Railway /
 * Nixpacks buildCommand is set to.  It is a no-op outside Railway environments.
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const isRailway = !!(
  process.env.RAILWAY_ENVIRONMENT ||
  process.env.RAILWAY_PROJECT_ID ||
  process.env.RAILWAY_SERVICE_ID ||
  process.env.RAILWAY_DEPLOYMENT_ID ||
  process.env.RAILWAY_GIT_COMMIT_SHA ||
  process.env.AF_NEXT_DIST_DIR?.startsWith('.next-railway')
);

const isLinuxProdBuild =
  process.env.NODE_ENV === 'production' &&
  process.platform === 'linux' &&
  !process.env.VERCEL &&
  !process.env.VERCEL_URL;
const MIN_RAILWAY_CSS_BYTES = 100_000;

if (!isRailway && !isLinuxProdBuild) {
  console.log('[railway-prebuild] Not a Railway/Linux prod build — skipping Tailwind CLI prebuild.');
  process.exit(0);
}

console.log('[railway-prebuild] Railway detected (env=%s). Pre-compiling Tailwind CSS via CLI...',
  process.env.RAILWAY_ENVIRONMENT || 'unknown');

const cwd = process.cwd();
const globalsIn  = path.join(cwd, 'app', 'globals.css');
const globalsOut = path.join(cwd, 'app', 'globals-compiled.css');
const railwayStylesOut = path.join(cwd, 'public', 'railway-styles.css');
const twConfig   = path.join(cwd, 'tailwind.config.js');
const twBin      = path.join(cwd, 'node_modules', '.bin', 'tailwindcss');

function readRailwayFallbackBytes() {
  try {
    return fs.statSync(railwayStylesOut).size;
  } catch {
    return 0;
  }
}

const fallbackBytes = readRailwayFallbackBytes();
if (fallbackBytes >= MIN_RAILWAY_CSS_BYTES && process.env.AF_FORCE_TAILWIND_PREBUILD !== '1') {
  fs.copyFileSync(railwayStylesOut, globalsIn);
  console.log(
    '[railway-prebuild] committed Railway fallback CSS found (%d bytes) - copied to app/globals.css.',
    fallbackBytes
  );
  process.exit(0);
}

// Sanity checks
if (!fs.existsSync(globalsIn)) {
  console.error('[railway-prebuild] ERROR: app/globals.css not found — cannot pre-compile.');
  process.exit(1);
}
if (!fs.existsSync(twBin)) {
  console.error('[railway-prebuild] ERROR: tailwindcss binary not found at', twBin);
  process.exit(1);
}

try {
  const source = fs.readFileSync(globalsIn, 'utf8');
  if (!source.includes('@tailwind')) {
    fs.copyFileSync(globalsIn, railwayStylesOut);
    const compiledBytes = fs.statSync(railwayStylesOut).size;
    if (compiledBytes < MIN_RAILWAY_CSS_BYTES) {
      console.warn(
        '[railway-prebuild] WARNING: compiled globals.css is only %d bytes - continuing with existing build pipeline.',
        compiledBytes
      );
    }
    console.log('[railway-prebuild] globals.css already compiled - copied to public/railway-styles.css (%d bytes).', compiledBytes);
    process.exit(0);
  }

  // Run Tailwind CLI: read globals.css (has @tailwind directives), write compiled CSS
  // to a temp file first (avoids reading-while-writing the same path), then swap.
  const cmd = `"${twBin}" -i "${globalsIn}" -o "${globalsOut}" --minify --config "${twConfig}"`;
  console.log('[railway-prebuild] Running:', cmd);
  execSync(cmd, { stdio: 'inherit', env: { ...process.env } });

  const compiledBytes = fs.statSync(globalsOut).size;
  console.log('[railway-prebuild] Tailwind CLI output: %d bytes', compiledBytes);

  if (compiledBytes < MIN_RAILWAY_CSS_BYTES) {
    console.warn(
      '[railway-prebuild] WARNING: compiled CSS is only %d bytes - continuing with existing build pipeline.',
      compiledBytes
    );
    fs.unlinkSync(globalsOut);
    process.exit(0);
  }

  // Replace globals.css with the compiled output.
  // webpack will see plain CSS (no @tailwind directives), so the tailwindcss
  // PostCSS plugin will be a no-op and autoprefixer will add vendor prefixes.
  fs.copyFileSync(globalsOut, globalsIn);
  fs.copyFileSync(globalsOut, railwayStylesOut);
  fs.unlinkSync(globalsOut);
  console.log('[railway-prebuild] ✓ app/globals.css replaced with compiled Tailwind CSS (%d bytes)', compiledBytes);
  console.log('[railway-prebuild] ✓ public/railway-styles.css written (%d bytes)', compiledBytes);

} catch (err) {
  console.error('[railway-prebuild] Tailwind CLI FAILED:', err.message);
  if (readRailwayFallbackBytes() >= MIN_RAILWAY_CSS_BYTES) {
    console.warn('[railway-prebuild] committed Railway fallback CSS is available - continuing build.');
    process.exit(0);
  }
  // Exit 1 only when there is no fallback; silent failure would produce an unstyled site.
  process.exit(1);
}
