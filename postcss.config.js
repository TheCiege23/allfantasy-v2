const path = require('path')

// Diagnostic: log when this config is evaluated so we can see it in Railway build logs.
// Remove after CSS is confirmed working.
console.log('[postcss.config.js] cwd=%s NODE_ENV=%s', process.cwd(), process.env.NODE_ENV)

module.exports = {
  plugins: {
    // Explicitly reference the .js config to prevent Tailwind from ever
    // attempting jiti/sucrase TypeScript loading on Railway (Node 22 Linux).
    // Must be a string path or plain options object — Next.js doesn't accept
    // require() results directly (they're functions, which it rejects).
    tailwindcss: { config: path.join(__dirname, 'tailwind.config.js') },
    autoprefixer: {},
  },
}
