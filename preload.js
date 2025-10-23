const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ===== File system operations =====
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),

  // ===== App data persistence =====
  saveAppData: (data) => ipcRenderer.invoke('save-app-data', data),
  loadAppData: () => ipcRenderer.invoke('load-app-data'),

  // ===== Data import/export =====
  exportData: (data) => ipcRenderer.invoke('export-data', data),
  importData: () => ipcRenderer.invoke('import-data'),

  // ===== App control =====
  restartApp: () => ipcRenderer.invoke('restart-app'),

  // ===== Auto-Updater APIs =====
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // ===== Update Events =====
  onUpdateStatus: (callback) => ipcRenderer.on('update-status', callback),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', callback),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
  onUpdateError: (callback) => ipcRenderer.on('update-error', callback),

  // ===== Menu-triggered events =====
  onTriggerExport: (callback) => ipcRenderer.on('trigger-export', callback),
  onTriggerBackup: (callback) => ipcRenderer.on('trigger-backup', callback),
  onTriggerUpdateCheck: (callback) => ipcRenderer.on('trigger-update-check', callback),

  // ===== Utility =====
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  
  /// Add this to your preload.js
removeUpdateListeners: () => {
  ipcRenderer.removeAllListeners('update-status');
  ipcRenderer.removeAllListeners('update-available');
  ipcRenderer.removeAllListeners('update-not-available');
  ipcRenderer.removeAllListeners('download-progress');
  ipcRenderer.removeAllListeners('update-downloaded');
  ipcRenderer.removeAllListeners('update-error');
}
});