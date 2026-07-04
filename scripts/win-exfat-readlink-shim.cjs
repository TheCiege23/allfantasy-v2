/**
 * Preloaded via `node --require` before `next build`. Restores a file that
 * `package.json`'s `build`/`build:railway` scripts have required since
 * commit a6ea90a91 but that was never committed — every build (local and
 * on Vercel) has been failing at Node startup with "Cannot find module"
 * ever since, regardless of platform, since a missing `--require` target
 * throws before anything else runs.
 *
 * Original intent (inferred from the filename and the exact error it
 * guards against): some Windows filesystems (exFAT-formatted drives) throw
 * `EISDIR` from `fs.readlink`/`fs.readlinkSync` on files Next's build-trace
 * step expects to be able to probe as potential symlinks, e.g.
 * "EISDIR: illegal operation on a directory, readlink 'app/.../page.tsx'".
 * Only patch on win32 — on Linux (Vercel's build environment) this file
 * only needs to exist so `--require` succeeds; the underlying filesystem
 * doesn't have this failure mode.
 */
if (process.platform === 'win32') {
  const fs = require('fs')

  const originalReadlink = fs.readlink
  fs.readlink = function patchedReadlink(path, optionsOrCallback, maybeCallback) {
    const callback = typeof optionsOrCallback === 'function' ? optionsOrCallback : maybeCallback
    const options = typeof optionsOrCallback === 'function' ? undefined : optionsOrCallback
    return originalReadlink.call(fs, path, options, (err, result) => {
      if (err && (err.code === 'EISDIR' || err.code === 'EINVAL')) {
        const notLinkError = new Error(`EINVAL: invalid argument, readlink '${path}'`)
        notLinkError.code = 'EINVAL'
        return callback(notLinkError)
      }
      callback(err, result)
    })
  }

  const originalReadlinkSync = fs.readlinkSync
  fs.readlinkSync = function patchedReadlinkSync(path, options) {
    try {
      return originalReadlinkSync.call(fs, path, options)
    } catch (err) {
      if (err && (err.code === 'EISDIR' || err.code === 'EINVAL')) {
        const notLinkError = new Error(`EINVAL: invalid argument, readlink '${path}'`)
        notLinkError.code = 'EINVAL'
        throw notLinkError
      }
      throw err
    }
  }
}
