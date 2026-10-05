// Electron entry point. This project uses ES modules ("type": "module").
import { app, BrowserWindow, dialog, ipcMain, Menu, safeStorage } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createBackupExport, createEmptyDocument, documentFromBackup, isPlainObject, validateDocument } from './src/data/document-format.js';
import { fileExists, readFirstValidFile, rotateBackupsAndReplace } from './src/data/storage-core.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_FOLDER = 'project-tracker-data';
const DATA_FILE = 'tracker.json';
const BACKUP_COUNT = 3;

function storagePaths() {
  const folder = path.join(app.getPath('userData'), STORAGE_FOLDER);
  return {
    folder,
    data: path.join(folder, DATA_FILE),
    backup: (number) => path.join(folder, `${DATA_FILE}.backup-${number}`),
  };
}

function encodeDocument(document) {
  const payload = JSON.stringify(document);
  if (safeStorage.isEncryptionAvailable()) {
    return JSON.stringify({ format: 'encrypted-v1', payload: safeStorage.encryptString(payload).toString('base64') });
  }
  return JSON.stringify({ format: 'plaintext-v1', payload });
}

function decodeDocument(raw) {
  const envelope = JSON.parse(raw);
  if (!isPlainObject(envelope) || typeof envelope.payload !== 'string') throw new Error('Invalid tracker envelope.');
  const payload = envelope.format === 'encrypted-v1'
    ? safeStorage.decryptString(Buffer.from(envelope.payload, 'base64'))
    : envelope.format === 'plaintext-v1' ? envelope.payload : null;
  if (!payload) throw new Error('Unsupported tracker envelope.');
  return validateDocument(JSON.parse(payload));
}

async function atomicWrite(document) {
  const paths = storagePaths();
  await fs.mkdir(paths.folder, { recursive: true });
  const temporary = `${paths.data}.${process.pid}.${Date.now()}.tmp`;
  const handle = await fs.open(temporary, 'w');
  try {
    await handle.writeFile(encodeDocument(document), 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rotateBackupsAndReplace({ dataPath: paths.data, temporaryPath: temporary, backupPath: paths.backup, backupCount: BACKUP_COUNT });
}

async function quarantine(file) {
  if (!await fileExists(file)) return null;
  const target = `${file}.corrupt-${Date.now()}`;
  await fs.rename(file, target);
  return target;
}

async function loadDocument() {
  const paths = storagePaths();
  await fs.mkdir(paths.folder, { recursive: true });
  const candidates = [paths.data, ...Array.from({ length: BACKUP_COUNT }, (_, index) => paths.backup(index + 1))];
  const result = await readFirstValidFile(candidates, decodeDocument);
  if (result.value && result.index > 0) {
    const damaged = await quarantine(paths.data);
    await fs.copyFile(result.file, paths.data);
    return { document: result.value, isNew: false, recovery: { state: 'restored-backup', damaged } };
  }
  if (result.value) return { document: result.value, isNew: false, recovery: { state: 'healthy' } };
  if (result.failures.length) return { document: null, isNew: false, recovery: { state: 'needs-recovery', failures: result.failures } };
  return { document: createEmptyDocument(), isNew: true, recovery: { state: 'healthy' } };
}

function storageStatus() {
  return { mode: 'electron', encrypted: safeStorage.isEncryptionAvailable(), backupCount: BACKUP_COUNT };
}

ipcMain.handle('tracker:load', async () => ({ ...(await loadDocument()), storage: storageStatus() }));
ipcMain.handle('tracker:save', async (_event, document) => {
  const clean = validateDocument(document);
  await atomicWrite(clean);
  return { document: clean, storage: storageStatus() };
});
ipcMain.handle('tracker:export', async () => {
  const loaded = await loadDocument();
  if (!loaded.document) return { cancelled: true, reason: 'No valid data is available to export.' };
  const result = await dialog.showSaveDialog({ title: "Export Abdelfatah's Project Tracker backup", defaultPath: 'project-tracker-backup.json', filters: [{ name: 'JSON backup', extensions: ['json'] }] });
  if (result.canceled || !result.filePath) return { cancelled: true };
  await fs.writeFile(result.filePath, JSON.stringify(createBackupExport(loaded.document), null, 2), 'utf8');
  return { cancelled: false, filePath: result.filePath };
});
ipcMain.handle('tracker:import', async () => {
  const result = await dialog.showOpenDialog({ title: "Import Abdelfatah's Project Tracker backup", properties: ['openFile'], filters: [{ name: 'JSON backup', extensions: ['json'] }] });
  if (result.canceled || !result.filePaths[0]) return { cancelled: true };
  const imported = JSON.parse(await fs.readFile(result.filePaths[0], 'utf8'));
  const clean = documentFromBackup(imported);
  await atomicWrite(clean);
  return { cancelled: false, document: clean, storage: storageStatus() };
});

function createWindow() {
  const iconPath = app.isPackaged
    ? path.join(__dirname, 'dist', 'app-icon.png')
    : path.join(__dirname, 'public', 'app-icon.png');
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'electron-preload.cjs'),
    },
  });
  win.setMenuBarVisibility(false);

  // Development uses Vite; a packaged app loads its own built files.
  if (app.isPackaged) {
    win.loadURL(pathToFileURL(path.join(__dirname, 'dist', 'index.html')).href);
  } else {
    win.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173');
  }
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
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
