// Tiny local server: serves the built UI, persists state as JSON and stores uploaded files.
// Zero runtime dependencies so the packaged desktop app stays small.
import http from 'node:http'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export function defaultDataDir() {
  if (process.env.SPIDEY_DATA) return process.env.SPIDEY_DATA
  const base =
    process.platform === 'darwin'
      ? path.join(os.homedir(), 'Library', 'Application Support', 'Spidey Tracker')
      : process.platform === 'win32'
        ? path.join(process.env.APPDATA || os.homedir(), 'Spidey Tracker')
        : path.join(os.homedir(), '.spidey-tracker')
  return path.join(base, 'data')
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
}

const MAX_BACKUPS = 30

export async function startServer({ port = 4747, dataDir = defaultDataDir(), staticDir = path.join(ROOT, 'dist') } = {}) {
  const uploadsDir = path.join(dataDir, 'uploads')
  const backupsDir = path.join(dataDir, 'backups')
  const dbFile = path.join(dataDir, 'db.json')
  await fsp.mkdir(uploadsDir, { recursive: true })
  await fsp.mkdir(backupsDir, { recursive: true })

  let lastBackup = 0

  async function saveState(body) {
    JSON.parse(body) // refuse to persist invalid JSON
    const tmp = dbFile + '.tmp'
    await fsp.writeFile(tmp, body)
    await fsp.rename(tmp, dbFile)
    // Rolling backups, at most one every 10 minutes.
    if (Date.now() - lastBackup > 10 * 60 * 1000) {
      lastBackup = Date.now()
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      await fsp.writeFile(path.join(backupsDir, `db-${stamp}.json`), body)
      const files = (await fsp.readdir(backupsDir)).filter((f) => f.startsWith('db-')).sort()
      for (const f of files.slice(0, Math.max(0, files.length - MAX_BACKUPS))) {
        await fsp.unlink(path.join(backupsDir, f)).catch(() => {})
      }
    }
  }

  function readBody(req, limit = 200 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
      const chunks = []
      let size = 0
      req.on('data', (c) => {
        size += c.length
        if (size > limit) {
          reject(new Error('Payload too large'))
          req.destroy()
        } else chunks.push(c)
      })
      req.on('end', () => resolve(Buffer.concat(chunks)))
      req.on('error', reject)
    })
  }

  function send(res, status, data, type = 'application/json; charset=utf-8') {
    res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' })
    res.end(typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data))
  }

  async function serveFile(res, file, req) {
    try {
      const stat = await fsp.stat(file)
      if (!stat.isFile()) throw new Error('not a file')
      const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream'
      const headers = { 'Content-Type': type, 'Content-Length': stat.size }
      if (req?.url?.startsWith('/files/')) headers['Content-Disposition'] = 'inline'
      res.writeHead(200, headers)
      fs.createReadStream(file).pipe(res)
      return true
    } catch {
      return false
    }
  }

  const safeJoin = (base, rel) => {
    const p = path.normalize(path.join(base, rel))
    return p.startsWith(base) ? p : null
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost')
      const p = decodeURIComponent(url.pathname)

      if (p === '/api/state' && req.method === 'GET') {
        try {
          return send(res, 200, await fsp.readFile(dbFile, 'utf8'))
        } catch {
          return send(res, 200, 'null')
        }
      }
      if (p === '/api/state' && req.method === 'PUT') {
        const body = (await readBody(req, 50 * 1024 * 1024)).toString('utf8')
        await saveState(body)
        return send(res, 200, { ok: true, savedAt: Date.now() })
      }
      if (p === '/api/upload' && req.method === 'POST') {
        const name = (url.searchParams.get('name') || 'file').replace(/[^\w.\- ()]+/g, '_').slice(-120)
        const id = crypto.randomBytes(5).toString('hex')
        const fileName = `${id}-${name}`
        const buf = await readBody(req)
        await fsp.writeFile(path.join(uploadsDir, fileName), buf)
        return send(res, 200, { url: `/files/${encodeURIComponent(fileName)}`, fileName, size: buf.length })
      }
      if (p.startsWith('/api/upload/') && req.method === 'DELETE') {
        const file = safeJoin(uploadsDir, path.basename(p.slice('/api/upload/'.length)))
        if (file) await fsp.unlink(file).catch(() => {})
        return send(res, 200, { ok: true })
      }
      if (p === '/api/info') {
        return send(res, 200, { dataDir, uploadsDir, backupsDir })
      }
      if (p === '/api/backups') {
        const files = (await fsp.readdir(backupsDir)).filter((f) => f.startsWith('db-')).sort().reverse()
        return send(res, 200, files)
      }
      if (p.startsWith('/api/backups/') && req.method === 'GET') {
        const file = safeJoin(backupsDir, path.basename(p.slice('/api/backups/'.length)))
        if (file && (await serveFile(res, file, req))) return
        return send(res, 404, { error: 'not found' })
      }
      if (p.startsWith('/files/')) {
        const file = safeJoin(uploadsDir, path.basename(p.slice('/files/'.length)))
        if (file && (await serveFile(res, file, req))) return
        return send(res, 404, 'Not found', 'text/plain')
      }
      if (p.startsWith('/templates/')) {
        const file = safeJoin(path.join(ROOT, 'templates'), path.basename(p))
        if (file && (await serveFile(res, file, req))) return
        return send(res, 404, { error: 'not found' })
      }
      // Static UI (SPA fallback to index.html)
      const file = safeJoin(staticDir, p === '/' ? 'index.html' : p.slice(1))
      if (file && (await serveFile(res, file, req))) return
      if (await serveFile(res, path.join(staticDir, 'index.html'), req)) return
      send(res, 404, 'UI not built. Run `npm run build`.', 'text/plain')
    } catch (err) {
      send(res, 500, { error: String(err?.message || err) })
    }
  })

  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', resolve)
  })
  return { server, port: server.address().port, dataDir }
}

// `node server/index.js` → standalone mode (open in any browser)
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const port = Number(process.env.PORT || 4747)
  startServer({ port }).then(({ port, dataDir }) => {
    console.log(`🕷️  Spidey Tracker server on http://localhost:${port}`)
    console.log(`   data: ${dataDir}`)
  })
}
