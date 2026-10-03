// Builds shareable zips for friends: macOS (Apple Silicon + Intel) and Windows.
// Run: npm run dist   → release/*.zip
import { packager } from '@electron/packager'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const NAME = 'Spidey Tracker'
const OUT = path.join(ROOT, 'release')
const targets = [
  { platform: 'darwin', arch: 'arm64', zip: 'SpideyTracker-mac-apple-silicon.zip' },
  { platform: 'darwin', arch: 'x64', zip: 'SpideyTracker-mac-intel.zip' },
  { platform: 'win32', arch: 'x64', zip: 'SpideyTracker-windows.zip' },
]

for (const t of targets) {
  const [dir] = await packager({
    dir: ROOT,
    name: NAME,
    platform: t.platform,
    arch: t.arch,
    appBundleId: 'local.spidey.tracker',
    icon: path.join(ROOT, 'build', t.platform === 'win32' ? 'icon.ico' : 'icon.icns'),
    out: OUT,
    overwrite: true,
    prune: true,
    asar: false,
    ignore: [/^\/src/, /^\/release/, /^\/scripts/, /^\/public/, /^\/templates\/research/, /\.ts$/, /^\/index\.html$/, /^\/\.git/],
  })
  const zip = path.join(OUT, t.zip)
  fs.rmSync(zip, { force: true })
  if (t.platform === 'darwin') {
    const app = path.join(dir, `${NAME}.app`)
    execSync(`codesign --force --deep --sign - "${app}"`)
    execSync(`ditto -c -k --sequesterRsrc --keepParent "${app}" "${zip}"`)
  } else {
    execSync(`cd "${OUT}" && zip -qry "${zip}" "${path.basename(dir)}"`)
  }
  console.log(`✓ ${t.zip}  (${(fs.statSync(zip).size / 1048576).toFixed(0)} MB)`)
}
