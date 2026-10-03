import { app, BrowserWindow, shell, Menu, nativeTheme } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { startServer } from '../server/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
app.setName('Spidey Tracker')

let win
let baseUrl

async function boot() {
  const dataDir = path.join(app.getPath('userData'), 'data')
  let started
  try {
    started = await startServer({ port: 4848, dataDir })
  } catch {
    started = await startServer({ port: 0, dataDir })
  }
  baseUrl = `http://127.0.0.1:${started.port}`
  createWindow()
}

function createWindow() {
  nativeTheme.themeSource = 'dark'
  win = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 1024,
    minHeight: 680,
    title: 'Spidey Tracker',
    backgroundColor: '#0b0d1a',
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 16, y: 18 } } : { autoHideMenuBar: true }),
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: { plugins: true, contextIsolation: true, spellcheck: true },
  })
  win.loadURL(baseUrl)

  const isInternal = (url) => url.startsWith(baseUrl)
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isInternal(url)) {
      // Uploaded files (PDFs etc.) open in their own app window.
      const child = new BrowserWindow({
        width: 1100,
        height: 900,
        backgroundColor: '#0b0d1a',
        webPreferences: { plugins: true },
      })
      child.loadURL(url)
      return { action: 'deny' }
    }
    shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (e, url) => {
    if (!isInternal(url)) {
      e.preventDefault()
      shell.openExternal(url)
    }
  })
}

Menu.setApplicationMenu(
  Menu.buildFromTemplate([
    { role: 'appMenu' },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    { role: 'windowMenu' },
  ]),
)

app.whenReady().then(boot)
app.on('window-all-closed', () => app.quit())
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && baseUrl) createWindow()
})
