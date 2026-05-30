// Diagnostic PostCSS plugin — logs CSS output bytes so we can confirm whether
// PostCSS is producing any CSS on Railway. Remove after CSS is confirmed working.
//
// Must be exported as a FUNCTION (not a plain object) so Next.js's
// createLazyPostCssPlugin wrapper can call result(...args) correctly.
// The function receives options, returns the PostCSS 8 plugin descriptor object.
const PostCSSDebug = (opts) => {
  return {
    postcssPlugin: 'postcss-debug',
    OnceExit(root) {
      try {
        const css = root.toResult({ map: false }).css
        const bytes = Buffer.byteLength(css, 'utf8')
        const file = (root.source && root.source.input && root.source.input.file) || 'unknown'
        console.log('[postcss-debug] file=%s output bytes=%d', file, bytes)
        if (bytes === 0) {
          console.error('[postcss-debug] ERROR: EMPTY CSS! PostCSS produced 0 bytes for ' + file)
        } else if (bytes < 5000) {
          console.log('[postcss-debug] Small CSS (first 300 chars):', css.substring(0, 300))
        }
      } catch(e) {
        console.error('[postcss-debug] Error reading CSS output:', e.message)
      }
    }
  }
}
PostCSSDebug.postcss = true
module.exports = PostCSSDebug
