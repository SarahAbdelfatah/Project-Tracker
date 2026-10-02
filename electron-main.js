// Electron entry point. This project uses ES modules ("type": "module").
import { app, BrowserWindow, dialog, ipcMain, safeStorage } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function text(value, label, { required = false, max = 500 } = {}) {
  if (typeof value !== 'string') {
    if (required) throw new Error(`${label} must be text.`);
    return '';
  }
  const clean = value.trim();
  if (required && !clean) throw new Error(`${label} is required.`);
  if (clean.length > max) throw new Error(`${label} is too long.`);
  return clean;
}

function validateProject(project, index, ids) {
  if (!isPlainObject(project)) throw new Error(`Project ${index + 1} is invalid.`);
  const id = Number(project.id);
  if (!Number.isSafeInteger(id) || id < 1 || ids.has(id)) throw new Error(`Project ${index + 1} has an invalid ID.`);
  ids.add(id);
  return {
    id,
    name: text(project.name, 'Project name', { required: true }),
    client: text(project.client, 'Client', { required: true }),
    opid: text(project.opid, 'OPID', { required: true, max: 120 }).toUpperCase(),
    state: ['Active', 'Closed', 'On Hold'].includes(project.state) ? project.state : 'Active',
    stage: ['qualification', 'bidding', 'delivery'].includes(project.stage) ? project.stage : 'qualification',
    phase: text(project.phase, 'Phase', { max: 120 }),
    step: text(project.step, 'Step', { max: 160 }),
    updated: text(project.updated, 'Updated date', { max: 120 }) || new Date().toLocaleDateString('en-US'),
  };
}

function validateProjectDetails(value, validIds) {
  if (!isPlainObject(value)) return {};
  const output = {};
  for (const [rawId, detail] of Object.entries(value)) {
    const id = Number(rawId);
    if (!validIds.has(id) || !isPlainObject(detail)) continue;
    const inputs = Array.isArray(detail.inputs) ? detail.inputs.slice(0, 100).map((input, index) => ({
      id: text(input?.id, `Input ${index + 1} ID`, { max: 120 }) || `input-${index + 1}`,
      label: text(input?.label, `Input ${index + 1} label`, { max: 300 }) || 'Project input',
      received: Boolean(input?.received),
      status: text(input?.status, `Input ${index + 1} status`, { max: 120 }),
    })) : [];
    const bom = Array.isArray(detail.bom) ? detail.bom.slice(0, 2000).map((row, index) => ({
      id: text(row?.id, `BOM row ${index + 1} ID`, { max: 120 }) || `bom-${index + 1}`,
      partNumber: text(row?.partNumber, `BOM row ${index + 1} part number`, { max: 180 }),
      description: text(row?.description, `BOM row ${index + 1} description`, { max: 1000 }),
      quantity: text(row?.quantity, `BOM row ${index + 1} quantity`, { max: 80 }),
      notes: text(row?.notes, `BOM row ${index + 1} notes`, { max: 1000 }),
      isNew: Boolean(row?.isNew),
    })) : [];
    const workflow = {};
    if (isPlainObject(detail.workflow)) {
      for (const [step, entry] of Object.entries(detail.workflow).slice(0, 100)) {
        if (!isPlainObject(entry)) continue;
        const cleanStep = text(step, 'Workflow step', { max: 180 });
        if (!cleanStep) continue;
        workflow[cleanStep] = {
          status: ['upcoming', 'current', 'complete'].includes(entry.status) ? entry.status : 'upcoming',
          date: text(entry.date, `${cleanStep} date`, { max: 40 }),
          specs: text(entry.specs, `${cleanStep} specifications`, { max: 10000 }),
        };
      }
    }
    output[id] = {
      created: text(detail.created, 'Project created date', { max: 120 }),
      requirement: text(detail.requirement, 'Project requirement', { max: 10000 }),
      requirementFollowUp: text(detail.requirementFollowUp, 'Project requirement follow-up', { max: 5000 }),
      inputs,
      bom,
      workflow,
    };
  }
  return output;
}

function validateActivity(value, validIds) {
  if (!isPlainObject(value)) return {};
  const output = {};
  for (const [rawId, events] of Object.entries(value)) {
    const id = Number(rawId);
    if (!validIds.has(id) || !Array.isArray(events)) continue;
    output[id] = events.slice(0, 5000).filter(isPlainObject).map((event, index) => ({
      id: text(event.id, `Activity ${index + 1} ID`, { max: 120 }) || `activity-${index + 1}`,
      action: text(event.action, `Activity ${index + 1} action`, { max: 500 }) || 'Project updated',
      timestamp: text(event.timestamp, `Activity ${index + 1} timestamp`, { max: 160 }) || new Date().toLocaleString('en-US'),
    }));
  }
  return output;
}

function validateDocument(value) {
  if (!isPlainObject(value) || value.schemaVersion !== 1 || !Array.isArray(value.projects)) {
    throw new Error('The tracker data format is not recognised.');
  }
  if (value.projects.length > 10000) throw new Error('The tracker contains too many projects.');
  const ids = new Set();
  const metadata = isPlainObject(value.metadata) ? value.metadata : {};
  const preferences = isPlainObject(value.preferences) ? value.preferences : {};
  const dashboard = isPlainObject(preferences.dashboard) ? preferences.dashboard : {};
  const projects = value.projects.map((project, index) => validateProject(project, index, ids));
  return {
    schemaVersion: 1,
    metadata: {
      createdAt: text(metadata.createdAt, 'Created date', { max: 80 }) || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    preferences: {
      theme: preferences.theme === 'dark' ? 'dark' : 'light',
      sidebarCollapsed: Boolean(preferences.sidebarCollapsed),
      dashboard: {
        focus: text(dashboard.focus, 'Dashboard focus', { max: 60 }) || 'all',
        state: text(dashboard.state, 'Dashboard state', { max: 60 }) || 'all',
        stage: text(dashboard.stage, 'Dashboard stage', { max: 60 }) || 'all',
        phase: text(dashboard.phase, 'Dashboard phase', { max: 60 }) || 'all',
        client: text(dashboard.client, 'Dashboard client', { max: 300 }) || 'all',
        inputs: text(dashboard.inputs, 'Dashboard inputs', { max: 60 }) || 'all',
        content: text(dashboard.content, 'Dashboard content', { max: 60 }) || 'all',
        age: text(dashboard.age, 'Dashboard age', { max: 60 }) || 'all',
        sort: text(dashboard.sort, 'Dashboard sort', { max: 60 }) || 'recent',
      },
    },
    projects,
    projectDetailsById: validateProjectDetails(value.projectDetailsById, ids),
    activityByProjectId: validateActivity(value.activityByProjectId, ids),
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

async function exists(file) {
  try { await fs.access(file); return true; } catch { return false; }
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
  for (let index = BACKUP_COUNT; index >= 2; index -= 1) {
    if (await exists(paths.backup(index - 1))) await fs.copyFile(paths.backup(index - 1), paths.backup(index));
  }
  if (await exists(paths.data)) await fs.copyFile(paths.data, paths.backup(1));
  await fs.rename(temporary, paths.data);
}

async function quarantine(file) {
  if (!await exists(file)) return null;
  const target = `${file}.corrupt-${Date.now()}`;
  await fs.rename(file, target);
  return target;
}

async function loadDocument() {
  const paths = storagePaths();
  await fs.mkdir(paths.folder, { recursive: true });
  const candidates = [paths.data, ...Array.from({ length: BACKUP_COUNT }, (_, index) => paths.backup(index + 1))];
  const failures = [];
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if (!await exists(candidate)) continue;
    try {
      const document = decodeDocument(await fs.readFile(candidate, 'utf8'));
      if (index > 0) {
        const damaged = await quarantine(paths.data);
        await fs.copyFile(candidate, paths.data);
        return { document, isNew: false, recovery: { state: 'restored-backup', damaged } };
      }
      return { document, isNew: false, recovery: { state: 'healthy' } };
    } catch (error) {
      failures.push({ file: candidate, reason: error.message });
    }
  }
  if (failures.length) return { document: null, isNew: false, recovery: { state: 'needs-recovery', failures } };
  return { document: createEmptyDocument(), isNew: true, recovery: { state: 'healthy' } };
}

function createEmptyDocument() {
  const now = new Date().toISOString();
  return { schemaVersion: 1, metadata: { createdAt: now, updatedAt: now }, preferences: { theme: 'light', sidebarCollapsed: false, dashboard: { focus: 'all', state: 'all', stage: 'all', phase: 'all', client: 'all', inputs: 'all', content: 'all', age: 'all', sort: 'recent' } }, projects: [], projectDetailsById: {}, activityByProjectId: {} };
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
  const result = await dialog.showSaveDialog({ title: 'Export Project Tracker backup', defaultPath: 'project-tracker-backup.json', filters: [{ name: 'JSON backup', extensions: ['json'] }] });
  if (result.canceled || !result.filePath) return { cancelled: true };
  await fs.writeFile(result.filePath, JSON.stringify({ exportVersion: 1, exportedAt: new Date().toISOString(), document: loaded.document }, null, 2), 'utf8');
  return { cancelled: false, filePath: result.filePath };
});
ipcMain.handle('tracker:import', async () => {
  const result = await dialog.showOpenDialog({ title: 'Import Project Tracker backup', properties: ['openFile'], filters: [{ name: 'JSON backup', extensions: ['json'] }] });
  if (result.canceled || !result.filePaths[0]) return { cancelled: true };
  const imported = JSON.parse(await fs.readFile(result.filePaths[0], 'utf8'));
  const clean = validateDocument(isPlainObject(imported) && imported.document ? imported.document : imported);
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
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'electron-preload.cjs'),
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
