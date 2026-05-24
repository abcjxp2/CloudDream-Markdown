import { marked } from './vendor/marked/marked.esm.js';
import hljs from './vendor/highlight/highlight.min.js';
import DOMPurify from './vendor/dompurify/purify.es.mjs';

const preview = document.querySelector('#preview');
const dropZone = document.querySelector('#dropZone');
const highlightTheme = document.querySelector('#highlightTheme');
const emptyState = document.querySelector('#emptyState');
const openButton = document.querySelector('#openButton');
const searchInput = document.querySelector('#searchInput');
const editBar = document.querySelector('#editBar');
const editorLayout = document.querySelector('#editorLayout');
const editorInput = document.querySelector('#editorInput');
const saveButton = document.querySelector('#saveButton');
const saveAsButton = document.querySelector('#saveAsButton');
const exitEditButton = document.querySelector('#exitEditButton');
let currentDirectory = null;
let currentDirectoryUrl = null;
let currentMarkdown = '';
let editMode = false;
let dirty = false;

const initialMarkdown = '';

marked.use({
  gfm: true,
  breaks: false,
  async: false,
  pedantic: false,
  renderer: {
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      const safeHref = resolveFileUrl(href || '#');
      const safeTitle = title ? ` title="${title}"` : '';
      return `<a href="${safeHref}"${safeTitle} target="_blank" rel="noreferrer">${text}</a>`;
    },
    image({ href, title, text }) {
      const safeHref = resolveFileUrl(href || '');
      const safeTitle = title ? ` title="${title}"` : '';
      return `<img src="${safeHref}" alt="${text || ''}"${safeTitle}>`;
    }
  }
});

function resolveFileUrl(href) {
  if (!href || href.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) {
    return href;
  }

  if (!currentDirectory) return href;

  return new URL(href, currentDirectoryUrl).href;
}

function renderMarkdown(markdown, target = preview) {
  const isEmpty = markdown.trim().length === 0;
  if (target === preview) {
    preview.classList.toggle('is-empty', isEmpty);
    emptyState.hidden = editMode || !isEmpty;
  }
  const raw = marked.parse(markdown);
  target.innerHTML = DOMPurify.sanitize(raw, {
    ADD_ATTR: ['target', 'rel']
  });

  target.querySelectorAll('pre code').forEach((block) => {
    hljs.highlightElement(block);
  });
}

function setFile(payload) {
  currentDirectory = payload.directory;
  currentDirectoryUrl = payload.directoryUrl;
  currentMarkdown = payload.content;
  if (editMode && dirty) return;
  if (editMode) {
    editorInput.value = currentMarkdown;
  }
  renderMarkdown(currentMarkdown);
}

function showError(message) {
  renderMarkdown(`# 打开失败\n\n> ${message}`);
}

function setEditMode(value) {
  if (value && !currentMarkdown) return;
  if (!value && !canReplaceDocument()) return;

  editMode = value;
  dirty = false;
  document.body.classList.toggle('is-editing', editMode);
  editBar.hidden = !editMode;
  editorLayout.hidden = !editMode;
  preview.hidden = editMode;
  emptyState.hidden = editMode || currentMarkdown.trim().length > 0;
  window.xpmd.setEditing(editMode);

  if (editMode) {
    editorInput.value = currentMarkdown;
    editorInput.focus();
  }
}

async function saveCurrent() {
  try {
    const payload = await window.xpmd.saveMarkdown(editorInput.value);
    if (!payload) return;
    currentMarkdown = payload.content;
    dirty = false;
    renderMarkdown(currentMarkdown);
  } catch (error) {
    alert(error.message || '保存失败');
  }
}

async function saveCurrentAs() {
  try {
    const payload = await window.xpmd.saveMarkdownAs(editorInput.value);
    if (!payload) return;
    currentMarkdown = payload.content;
    dirty = false;
    renderMarkdown(currentMarkdown);
  } catch (error) {
    alert(error.message || '另存为失败');
  }
}

function canReplaceDocument() {
  if (!editMode || !dirty) return true;
  return confirm('有未保存修改，确定放弃？');
}

openButton.addEventListener('click', () => {
  window.xpmd.openMarkdown();
});

editorInput.addEventListener('input', () => {
  dirty = editorInput.value !== currentMarkdown;
});

saveButton.addEventListener('click', saveCurrent);
saveAsButton.addEventListener('click', saveCurrentAs);
exitEditButton.addEventListener('click', () => setEditMode(false));

searchInput.addEventListener('input', () => {
  const query = searchInput.value.trim();
  if (!query) {
    window.xpmd.clearSearch();
    return;
  }

  window.xpmd.findText(query, { findNext: false, forward: true });
});

searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    const query = searchInput.value.trim();
    if (query) {
      window.xpmd.findText(query, { findNext: true, forward: !event.shiftKey });
    }
  }

  if (event.key === 'Escape') {
    searchInput.value = '';
    searchInput.blur();
    window.xpmd.clearSearch();
  }
});

dropZone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropZone.classList.add('is-dragging');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('is-dragging');
});

dropZone.addEventListener('drop', async (event) => {
  event.preventDefault();
  dropZone.classList.remove('is-dragging');

  const file = event.dataTransfer.files[0];
  if (!file) return;

  const filePath = window.xpmd.getPathForFile(file);

  if (!/\.(md|markdown|mdown|mkd)$/i.test(filePath)) {
    showError('这里只接受 Markdown 文件。');
    return;
  }

  await window.xpmd.openPath(filePath);
});

window.xpmd.onMarkdownOpened(setFile);
window.xpmd.onMarkdownUpdated(setFile);
window.xpmd.onMarkdownError(showError);
window.xpmd.onThemeChanged(applyTheme);
window.xpmd.onEditCommand((command) => {
  if (command === 'toggleEdit') setEditMode(!editMode);
  if (command === 'save' && editMode) saveCurrent();
  if (command === 'saveAs' && editMode) saveCurrentAs();
});
window.xpmd.onSearchFocus(() => {
  searchInput.focus();
  searchInput.select();
});

renderMarkdown(initialMarkdown);

function applyTheme(payload) {
  document.documentElement.dataset.theme = payload.resolvedTheme;
  highlightTheme.href = payload.resolvedTheme === 'dark'
    ? './vendor/highlight/github-dark.min.css'
    : './vendor/highlight/github.min.css';
}

window.xpmd.getTheme().then(applyTheme);
window.__xpmdCanReplaceDocument = canReplaceDocument;
