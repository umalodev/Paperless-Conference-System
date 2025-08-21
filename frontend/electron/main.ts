import { app, BrowserWindow } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  console.log('main: Creating window...');
  console.log('main: Preload path:', path.join(__dirname, 'preload.mjs'));
  
  const preloadPath = path.join(__dirname, 'preload.mjs');
  
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: preloadPath,
      // CRITICAL: Enable screen sharing
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Disable for localhost development
      allowRunningInsecureContent: true,
      experimentalFeatures: true
    },
  })
  
  console.log('main: Window created with preload:', preloadPath);

  // CRITICAL: Set ALL permissions to ALLOW
  win.webContents.session.setPermissionRequestHandler((_, permission, callback) => {
    console.log('Permission request:', permission);
    // Allow ALL permissions for screen sharing
    callback(true);
  });

  // CRITICAL: Set ALL permission checks to ALLOW
  win.webContents.session.setPermissionCheckHandler((_, permission, requestingOrigin) => {
    console.log('Permission check:', permission, requestingOrigin);
    // Allow ALL permissions for local development
    return true;
  });
  
  // CRITICAL: Enable all permissions for screen sharing
  console.log('main: All permissions enabled for screen sharing');

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)
