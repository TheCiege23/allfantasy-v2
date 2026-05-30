const path = require('path')

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
