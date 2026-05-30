const path = require('path')

module.exports = {
  plugins: {
    // Explicitly reference the .js config to prevent Tailwind from ever
    // attempting jiti/sucrase TypeScript loading on Railway (Node 22 Linux).
    tailwindcss: { config: path.join(__dirname, 'tailwind.config.js') },
    autoprefixer: {},
  },
}
