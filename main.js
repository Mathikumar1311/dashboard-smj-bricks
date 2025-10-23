const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { autoUpdater } = require('electron-updater');

const isDev = process.env.NODE_ENV === 'development';
let mainWindow;
let splashWindow;

// Paths for app data storage
const userDataPath = app.getPath('userData');
const dataFilePath = path.join(userDataPath, 'app-data.json');

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 600,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    show: false,
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  splashWindow.loadFile('splash.html');
  splashWindow.once('ready-to-show', () => {
    splashWindow.show();
  });

  return splashWindow;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false,
    titleBarStyle: 'default'
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    // Close splash screen and show main window after delay
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
      }
      mainWindow.show();
      if (isDev) mainWindow.webContents.openDevTools();
    }, 3000); // Show splash for 3 seconds
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Export Data',
          click: () => mainWindow.webContents.send('trigger-export')
        },
        {
          label: 'Backup Data',
          click: () => mainWindow.webContents.send('trigger-backup')
        },
        { type: 'separator' },
        {
          label: 'Check for Updates',
          click: () => mainWindow.webContents.send('trigger-update-check')
        },
        { type: 'separator' },
        {
          label: 'Restart',
          click: () => {
            app.relaunch();
            app.exit();
          }
        },
        { label: 'Quit', click: () => app.quit() }
      ]
    },
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
        { role: 'togglefullscreen' }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Auto-Updater Initialization
function initializeAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  // Add this line to disable signature verification
  autoUpdater.disableWebInstaller = false;
  autoUpdater.forceDevUpdateConfig = !isDev ? false : true;

  // Rest of your existing auto-updater code...
  autoUpdater.on('checking-for-update', () => {
    console.log('🔍 Checking for updates...');
    mainWindow?.webContents.send('update-status', { status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    console.log('🎉 Update available:', info.version);
    mainWindow?.webContents.send('update-available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('✅ App is up to date');
    mainWindow?.webContents.send('update-not-available', {
      version: info?.version || 'current'
    });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    console.log(`📥 Download progress: ${Math.round(progressObj.percent)}%`);
    mainWindow?.webContents.send('download-progress', {
      percent: Math.round(progressObj.percent),
      bytesPerSecond: progressObj.bytesPerSecond,
      total: progressObj.total,
      transferred: progressObj.transferred
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('✅ Update downloaded, ready to install');
    mainWindow?.webContents.send('update-downloaded', {
      version: info.version,
      releaseDate: info.releaseDate
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('❌ Update error:', err);
    mainWindow?.webContents.send('update-error', {
      message: err.message,
      stack: err.stack
    });
  });

  // Check for updates on startup (wait a bit for app to load)
  setTimeout(() => {
    if (!isDev) {
      autoUpdater.checkForUpdatesAndNotify();
    }
  }, 5000);
}

app.whenReady().then(() => {
  // Create splash screen first
  createSplashWindow();

  // Then create main window (it will be hidden initially)
  createMainWindow();

  // Initialize auto-updater
  initializeAutoUpdater();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createSplashWindow();
    createMainWindow();
  }
});

// Prevent external windows (security)
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event) => event.preventDefault());
});

//
// ─── IPC HANDLERS ─────────────────────────────────────────────
//

// ✅ Save and Load Local App Data
ipcMain.handle('save-app-data', async (event, data) => {
  try {
    await fs.ensureDir(userDataPath);
    await fs.writeJson(dataFilePath, data, { spaces: 2 });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-app-data', async () => {
  try {
    if (await fs.pathExists(dataFilePath)) {
      const data = await fs.readJson(dataFilePath);
      return { success: true, data };
    }
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ✅ File Operations
ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

ipcMain.handle('write-file', async (event, filePath, data) => {
  try {
    await fs.writeFile(filePath, data);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('file-exists', async (event, filePath) => {
  try {
    const exists = await fs.pathExists(filePath);
    return { success: true, exists };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ✅ Import/Export Data
ipcMain.handle('export-data', async (event, data) => {
  try {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `business-backup-${new Date().toISOString().split('T')[0]}.json`,
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });

    if (filePath) {
      await fs.writeJson(filePath, data, { spaces: 2 });
      return { success: true, filePath };
    }
    return { success: false, error: 'No file selected' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('import-data', async () => {
  try {
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
      properties: ['openFile']
    });

    if (filePaths && filePaths.length > 0) {
      const data = await fs.readJson(filePaths[0]);
      return { success: true, data };
    }
    return { success: false, error: 'No file selected' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ✅ App Control
ipcMain.handle('restart-app', () => {
  app.relaunch();
  app.exit();
});

// ✅ Auto-Updater Handlers
ipcMain.handle('check-for-updates', () => {
  return autoUpdater.checkForUpdates();
});

ipcMain.handle('quit-and-install', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// ✅ Menu Trigger Events
ipcMain.on('trigger-export', () => {
  mainWindow?.webContents.send('trigger-export');
});

ipcMain.on('trigger-backup', () => {
  mainWindow?.webContents.send('trigger-backup');
});

ipcMain.on('trigger-update-check', () => {
  mainWindow?.webContents.send('trigger-update-check');
});