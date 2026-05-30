const path = require('path')

// On Railway, the prebuild script (scripts/railway-tailwind-prebuild.cjs) runs
// Tailwind CLI before `next build`, replacing app/globals.css with compiled CSS
// (no @tailwind directives).  webpack then processes plain CSS, so we only need
// autoprefixer — the tailwindcss PostCSS plugin would be a no-op and adds
// unnecessary content-scanning overhead.
//
// Locally, tailwindcss runs inside PostCSS as normal (dev HMR needs it).
const isRailway = !!(
  process.env.RAILWAY_ENVIRONMENT ||
  process.env.RAILWAY_PROJECT_ID ||
  process.env.RAILWAY_SERVICE_ID
)

module.exports = {
  plugins: isRailway
    ? {
        // Railway: globals.css already compiled by Tailwind CLI in prebuild step.
        autoprefixer: {},
      }
    : {
        // Local dev / non-Railway builds: Tailwind runs through PostCSS as usual.
        // Explicitly reference the .js config to prevent jiti/sucrase TS loading.
        tailwindcss: { config: path.join(__dirname, 'tailwind.config.js') },
        autoprefixer: {},
      },
}
