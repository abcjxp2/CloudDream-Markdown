const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('xpmd', {
  openMarkdown: () => ipcRenderer.invoke('dialog:openMarkdown'),
  openPath: (filePath) => ipcRenderer.invoke('file:openPath', filePath),
  onMarkdownOpened: (callback) => ipcRenderer.on('markdown-opened', (_event, payload) => callback(payload)),
  onMarkdownUpdated: (callback) => ipcRenderer.on('markdown-updated', (_event, payload) => callback(payload)),
  onMarkdownError: (callback) => ipcRenderer.on('markdown-error', (_event, message) => callback(message))
});
