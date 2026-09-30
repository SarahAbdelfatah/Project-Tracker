// Electron entry point. This project uses ES modules ("type": "module").
import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createWindow() {
  const iconPath = app.isPackaged
    ? path.join(__dirname, 'dist', 'app-icon.png')
    : path.join(__dirname, 'public', 'app-icon.png');
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: iconPath,
    webPreferences: {
      // we don't need Node integration in the renderer; the app is pure React/Vite
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Development uses Vite; a packaged app loads its own built files.
  if (app.isPackaged) {
    win.loadURL(pathToFileURL(path.join(__dirname, 'dist', 'index.html')).href);
  } else {
    win.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173');
  }
}

app.whenReady().then(() => {
  createWindow();
  // macOS specific behaviour – re‑create a window when the dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit the app when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
