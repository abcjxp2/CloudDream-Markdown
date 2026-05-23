const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('xpmd', {
  openMarkdown: () => ipcRenderer.invoke('dialog:openMarkdown'),
  openPath: (filePath) => ipcRenderer.invoke('file:openPath', filePath),
  getPathForFile: (file) => webUtils?.getPathForFile(file) || file?.path || '',
  getTheme: () => ipcRenderer.invoke('theme:get'),
  findText: (query, options) => ipcRenderer.invoke('search:find', query, options),
  clearSearch: () => ipcRenderer.invoke('search:clear'),
  onMarkdownOpened: (callback) => ipcRenderer.on('markdown-opened', (_event, payload) => callback(payload)),
  onMarkdownUpdated: (callback) => ipcRenderer.on('markdown-updated', (_event, payload) => callback(payload)),
  onMarkdownError: (callback) => ipcRenderer.on('markdown-error', (_event, message) => callback(message)),
  onSearchFocus: (callback) => ipcRenderer.on('search-focus', () => callback()),
  onThemeChanged: (callback) => ipcRenderer.on('theme-changed', (_event, payload) => callback(payload))
});
