import { app, BrowserWindow, dialog, ipcMain, Menu, nativeTheme, shell } from 'electron';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow;
let pendingOpenFile = null;
let watchedFile = null;
let watcher = null;
let themeMode = 'system';
let currentFilePath = null;
let isEditing = false;

const productName = '云梦Markdown';
const isMarkdownFile = (filePath) => /\.(md|markdown|mdown|mkd)$/i.test(filePath);
const isThemeMode = (mode) => ['system', 'light', 'dark'].includes(mode);

function getThemeConfigPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function getResolvedTheme() {
  if (themeMode === 'dark') return 'dark';
  if (themeMode === 'light') return 'light';
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
}

function getThemePayload() {
  return {
    mode: themeMode,
    resolvedTheme: getResolvedTheme()
  };
}

async function loadSettings() {
  try {
    const settings = JSON.parse(await fsp.readFile(getThemeConfigPath(), 'utf8'));
    themeMode = isThemeMode(settings.themeMode) ? settings.themeMode : 'system';
  } catch {
    themeMode = 'system';
  }

  nativeTheme.themeSource = themeMode;
}

async function saveSettings() {
  await fsp.mkdir(app.getPath('userData'), { recursive: true });
  await fsp.writeFile(
    getThemeConfigPath(),
    `${JSON.stringify({ themeMode }, null, 2)}\n`
  );
}

function sendTheme() {
  if (!mainWindow) return;
  mainWindow.setBackgroundColor(getResolvedTheme() === 'dark' ? '#0d1117' : '#ffffff');
  mainWindow.webContents.send('theme-changed', getThemePayload());
}

async function setThemeMode(mode) {
  if (!isThemeMode(mode)) return;

  themeMode = mode;
  nativeTheme.themeSource = mode;
  await saveSettings();
  createMenu();
  sendTheme();
}

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

function setCurrentFilePath(filePath) {
  currentFilePath = filePath;
  mainWindow?.setTitle(filePath ? `${path.basename(filePath)} - ${productName}` : productName);
  createMenu();
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

  const canProceed = await mainWindow.webContents.executeJavaScript(
    'window.__xpmdCanReplaceDocument ? window.__xpmdCanReplaceDocument() : true'
  );
  if (!canProceed) return;

  const payload = await readMarkdown(filePath);
  setCurrentFilePath(filePath);
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

async function saveMarkdown(content, targetPath = currentFilePath) {
  if (!targetPath || !isMarkdownFile(targetPath)) {
    throw new Error('请选择 Markdown 文件。');
  }

  await fsp.writeFile(targetPath, content, 'utf8');
  setCurrentFilePath(targetPath);
  watchFile(targetPath);
  return readMarkdown(targetPath);
}

async function saveMarkdownAs(content) {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '另存为 Markdown',
    defaultPath: currentFilePath || '未命名.md',
    filters: [
      { name: 'Markdown', extensions: ['md', 'markdown'] }
    ]
  });

  if (result.canceled || !result.filePath) return null;

  const targetPath = isMarkdownFile(result.filePath) ? result.filePath : `${result.filePath}.md`;
  return saveMarkdown(content, targetPath);
}

function sendEditCommand(command) {
  mainWindow?.webContents.send('edit-command', command);
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
        {
          label: '保存',
          accelerator: 'CommandOrControl+S',
          enabled: Boolean(currentFilePath) && isEditing,
          click: () => sendEditCommand('save')
        },
        {
          label: '另存为...',
          accelerator: 'CommandOrControl+Shift+S',
          enabled: isEditing,
          click: () => sendEditCommand('saveAs')
        },
        { type: 'separator' },
        { role: 'close' }
      ]
    },
    {
      label: '设置',
      submenu: [
        {
          label: '主题',
          submenu: [
            {
              label: '跟随系统',
              type: 'radio',
              checked: themeMode === 'system',
              click: () => setThemeMode('system')
            },
            {
              label: '浅色',
              type: 'radio',
              checked: themeMode === 'light',
              click: () => setThemeMode('light')
            },
            {
              label: '深色',
              type: 'radio',
              checked: themeMode === 'dark',
              click: () => setThemeMode('dark')
            }
          ]
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'copy' },
        {
          label: isEditing ? '退出编辑模式' : '进入编辑模式',
          accelerator: 'CommandOrControl+E',
          enabled: Boolean(currentFilePath),
          click: () => sendEditCommand('toggleEdit')
        },
        {
          label: '查找',
          accelerator: 'CommandOrControl+F',
          click: () => mainWindow?.webContents.send('search-focus')
        },
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
    title: productName,
    backgroundColor: getResolvedTheme() === 'dark' ? '#0d1117' : '#ffffff',
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

  mainWindow.webContents.on('context-menu', (_event, params) => {
    const menuItems = [];

    if (params.isEditable) {
      menuItems.push(
        { label: '撤销', role: 'undo' },
        { label: '重做', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', role: 'cut' },
        { label: '复制', role: 'copy' },
        { label: '粘贴', role: 'paste' },
        { type: 'separator' },
        { label: '全选', role: 'selectAll' }
      );
      Menu.buildFromTemplate(menuItems).popup({ window: mainWindow });
      return;
    }

    if (params.selectionText) {
      menuItems.push({ label: '复制', role: 'copy' });
    }

    if (params.linkURL) {
      if (menuItems.length) menuItems.push({ type: 'separator' });
      menuItems.push({
        label: '打开链接',
        click: () => shell.openExternal(params.linkURL)
      });
      menuItems.push({
        label: '复制链接',
        click: () => mainWindow.webContents.copyLinkAt(params.x, params.y)
      });
    }

    if (!menuItems.length) {
      menuItems.push({
        label: '打开 Markdown 文件',
        click: openFilePicker
      });
    }

    menuItems.push({ type: 'separator' });
    menuItems.push({ label: '全选', role: 'selectAll' });

    Menu.buildFromTemplate(menuItems).popup({ window: mainWindow });
  });

  mainWindow.webContents.on('did-finish-load', async () => {
    sendTheme();

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

  mainWindow.on('close', async (event) => {
    if (!mainWindow) return;
    event.preventDefault();
    const canClose = await mainWindow.webContents.executeJavaScript(
      'window.__xpmdCanReplaceDocument ? window.__xpmdCanReplaceDocument() : true'
    );
    if (canClose) {
      mainWindow.destroy();
    }
  });
}

app.setName(productName);

app.whenReady().then(async () => {
  await loadSettings();
  createMenu();
  createWindow();

  const launchFile = process.argv.find((arg) => isMarkdownFile(arg));
  if (launchFile) pendingOpenFile = launchFile;

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

nativeTheme.on('updated', () => {
  if (themeMode === 'system') sendTheme();
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
ipcMain.handle('theme:get', () => getThemePayload());
ipcMain.handle('editor:save', async (_event, content) => {
  const payload = await saveMarkdown(content);
  mainWindow?.webContents.send('markdown-opened', payload);
  return payload;
});
ipcMain.handle('editor:saveAs', async (_event, content) => {
  const payload = await saveMarkdownAs(content);
  if (payload) mainWindow?.webContents.send('markdown-opened', payload);
  return payload;
});
ipcMain.handle('editor:setEditing', (_event, value) => {
  isEditing = Boolean(value);
  createMenu();
});
ipcMain.handle('search:find', (event, query, options = {}) => {
  const webContents = event.sender;
  if (!query) {
    webContents.stopFindInPage('clearSelection');
    return;
  }

  webContents.findInPage(query, {
    forward: options.forward !== false,
    findNext: Boolean(options.findNext)
  });
});
ipcMain.handle('search:clear', (event) => {
  event.sender.stopFindInPage('clearSelection');
});
