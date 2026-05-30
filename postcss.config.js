const path = require('path')

// On Railway the prebuild script (scripts/railway-tailwind-prebuild.cjs) runs
// the Tailwind CLI before `next build`, replacing app/globals.css with compiled
// plain CSS (no @tailwind directives).  When postcss-loader subsequently
// processes that file the tailwindcss plugin sees no @tailwind / @apply /
// @layer directives and is a pure passthrough — the compiled utility classes
// flow through unchanged.  autoprefixer then adds vendor prefixes and
// mini-css-extract-plugin extracts the CSS chunk normally.
//
// Using ONLY autoprefixer on Railway (the previous approach) caused
// mini-css-extract-plugin to receive 0 bytes for globals.css, so no CSS
// chunk appeared in app-build-manifest.json and every page was unstyled.
// Always including tailwindcss fixes this regardless of whether @tailwind
// directives are present in the file.
module.exports = {
  plugins: {
    // Explicitly reference the .js config to prevent jiti/sucrase TS loading.
    tailwindcss: { config: path.join(__dirname, 'tailwind.config.js') },
    autoprefixer: {},
  },
}
