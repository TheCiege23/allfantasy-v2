// Diagnostic PostCSS plugin — logs CSS output bytes so we can confirm whether
// PostCSS is producing any CSS on Railway. Remove after CSS is confirmed working.
/** @type {import('postcss').Plugin} */
const plugin = {
  postcssPlugin: 'postcss-debug',
  OnceExit(root) {
    try {
      const css = root.toResult({ map: false }).css
      const bytes = Buffer.byteLength(css, 'utf8')
      console.log('[postcss-debug] CSS output bytes=%d file=%s', bytes, root.source && root.source.input && root.source.input.file || 'unknown')
      if (bytes === 0) {
        console.error('[postcss-debug] ERROR: EMPTY CSS OUTPUT! PostCSS produced 0 bytes.')
      } else if (bytes < 5000) {
        console.log('[postcss-debug] Small CSS (first 300 chars):', css.substring(0, 300))
      }
    } catch(e) {
      console.error('[postcss-debug] Error reading CSS output:', e.message)
    }
  }
}
plugin.postcss = true
module.exports = plugin
