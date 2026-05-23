const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('xpmd', {
  openMarkdown: () => ipcRenderer.invoke('dialog:openMarkdown'),
  openPath: (filePath) => ipcRenderer.invoke('file:openPath', filePath),
  getTheme: () => ipcRenderer.invoke('theme:get'),
  onMarkdownOpened: (callback) => ipcRenderer.on('markdown-opened', (_event, payload) => callback(payload)),
  onMarkdownUpdated: (callback) => ipcRenderer.on('markdown-updated', (_event, payload) => callback(payload)),
  onMarkdownError: (callback) => ipcRenderer.on('markdown-error', (_event, message) => callback(message)),
  onThemeChanged: (callback) => ipcRenderer.on('theme-changed', (_event, payload) => callback(payload))
});
