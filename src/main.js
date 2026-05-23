import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow;
let pendingOpenFile = null;
let watchedFile = null;
let watcher = null;

const isMarkdownFile = (filePath) => /\.(md|markdown|mdown|mkd)$/i.test(filePath);

async function readMarkdown(filePath) {
  if (!filePath || !isMarkdownFile(filePath)) {
    throw new Error('请选择 Markdown 文件。');
  }

  const content = await fsp.readFile(filePath, 'utf8');
  return {
    filePath,
    directory: path.dirname(filePath),
    directoryUrl: pathToFileURL(`${path.dirname(filePath)}${path.sep}`).href,
    name: path.basename(filePath),
    content
  };
}

function watchFile(filePath) {
  if (watcher) {
    watcher.close();
    watcher = null;
  }

  watchedFile = filePath;
  if (!filePath) return;

  watcher = fs.watch(filePath, { persistent: false }, async () => {
    if (!mainWindow || watchedFile !== filePath) return;
    try {
      const payload = await readMarkdown(filePath);
      mainWindow.webContents.send('markdown-updated', payload);
    } catch (error) {
      mainWindow.webContents.send('markdown-error', error.message);
    }
  });
}

async function loadFileIntoWindow(filePath) {
  if (!mainWindow) {
    pendingOpenFile = filePath;
    return;
  }

  const payload = await readMarkdown(filePath);
  watchFile(filePath);
  mainWindow.webContents.send('markdown-opened', payload);
}

async function openFilePicker() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '打开 Markdown 文件',
    properties: ['openFile'],
    filters: [
      { name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'mkd'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePaths[0]) {
    await loadFileIntoWindow(result.filePaths[0]);
  }
}

function createMenu() {
  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: '文件',
      submenu: [
        {
          label: '打开...',
          accelerator: 'CommandOrControl+O',
          click: openFilePicker
        },
        { type: 'separator' },
        { role: 'close' }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'copy' },
        { role: 'selectAll' }
      ]
    },
    {
      label: '显示',
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

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1120,
    height: 820,
    minWidth: 760,
    minHeight: 560,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#f7f4ed',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('did-finish-load', async () => {
    if (pendingOpenFile) {
      const target = pendingOpenFile;
      pendingOpenFile = null;
      await loadFileIntoWindow(target);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (watcher) watcher.close();
  });
}

app.setName('XPMD');

app.whenReady().then(() => {
  createMenu();
  createWindow();

  const launchFile = process.argv.find((arg) => isMarkdownFile(arg));
  if (launchFile) pendingOpenFile = launchFile;

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('open-file', (event, filePath) => {
  event.preventDefault();
  pendingOpenFile = filePath;
  if (mainWindow) loadFileIntoWindow(filePath);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('dialog:openMarkdown', openFilePicker);
ipcMain.handle('file:openPath', async (_event, filePath) => {
  await loadFileIntoWindow(filePath);
});
