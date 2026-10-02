const { contextBridge, ipcRenderer } = require('electron');

// The renderer receives only these specific operations. It never receives Node,
// filesystem, encryption, or arbitrary IPC access.
contextBridge.exposeInMainWorld('projectTracker', Object.freeze({
  load: () => ipcRenderer.invoke('tracker:load'),
  save: (document) => ipcRenderer.invoke('tracker:save', document),
  exportBackup: () => ipcRenderer.invoke('tracker:export'),
  importBackup: () => ipcRenderer.invoke('tracker:import'),
}));
