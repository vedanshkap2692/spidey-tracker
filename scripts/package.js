// Packages the desktop app into release/ and installs it:
//   ~/Applications/Spidey Tracker.app  +  a Desktop shortcut.
// Run: npm run package
import { packager } from '@electron/packager'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const NAME = 'Spidey Tracker'

const [out] = await packager({
  dir: ROOT,
  name: NAME,
  appBundleId: 'local.spidey.tracker',
  icon: path.join(ROOT, 'build', 'icon.icns'),
  out: path.join(ROOT, 'release'),
  overwrite: true,
  prune: true,
  asar: false,
  ignore: [/^\/src/, /^\/release/, /^\/scripts/, /^\/public/, /^\/templates\/research/, /\.ts$/, /^\/index\.html$/],
})
const app = path.join(out, `${NAME}.app`)
// Re-sign ad-hoc so Apple Silicon accepts the modified bundle.
execSync(`codesign --force --deep --sign - "${app}"`, { stdio: 'inherit' })

if (process.platform === 'darwin' && !process.argv.includes('--no-install')) {
  const appsDir = path.join(os.homedir(), 'Applications')
  fs.mkdirSync(appsDir, { recursive: true })
  const dest = path.join(appsDir, `${NAME}.app`)
  fs.rmSync(dest, { recursive: true, force: true })
  execSync(`ditto "${app}" "${dest}"`)
  const link = path.join(os.homedir(), 'Desktop', `${NAME}.app`)
  try {
    fs.rmSync(link, { force: true, recursive: false })
  } catch {}
  if (!fs.existsSync(link)) fs.symlinkSync(dest, link)
  console.log(`✓ Installed ${dest}\n✓ Desktop shortcut ${link}`)
}
