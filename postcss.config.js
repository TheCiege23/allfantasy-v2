const path = require('path')

// Diagnostic: log when this config is evaluated so we can see it in Railway build logs.
// Remove after CSS is confirmed working.
console.log('[postcss.config.js] cwd=%s NODE_ENV=%s', process.cwd(), process.env.NODE_ENV)

// Diagnostic PostCSS plugin: log the output size after Tailwind runs.
const cssAuditPlugin = {
  postcssPlugin: 'af-css-audit',
  OnceExit(root, { result }) {
    const file = result.opts.from || '(unknown)'
    if (file.includes('globals')) {
      const css = root.toResult().css
      console.log('[af-css-audit] globals.css → %d bytes after PostCSS', css.length)
    }
  }
}
cssAuditPlugin.postcss = true

module.exports = {
  plugins: [
    // Explicitly reference the .js config to prevent Tailwind from ever
    // attempting jiti/sucrase TypeScript loading on Railway (Node 22 Linux).
    require('tailwindcss')({ config: path.join(__dirname, 'tailwind.config.js') }),
    require('autoprefixer'),
    cssAuditPlugin,
  ],
}
