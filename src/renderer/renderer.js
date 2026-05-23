import { marked } from './vendor/marked/marked.esm.js';
import hljs from './vendor/highlight/highlight.min.js';
import DOMPurify from './vendor/dompurify/purify.es.mjs';

const preview = document.querySelector('#preview');
const dropZone = document.querySelector('#dropZone');
const highlightTheme = document.querySelector('#highlightTheme');
const emptyState = document.querySelector('#emptyState');
const openButton = document.querySelector('#openButton');
const searchInput = document.querySelector('#searchInput');
let currentDirectory = null;
let currentDirectoryUrl = null;

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

function renderMarkdown(markdown) {
  const isEmpty = markdown.trim().length === 0;
  preview.classList.toggle('is-empty', isEmpty);
  emptyState.hidden = !isEmpty;
  const raw = marked.parse(markdown);
  preview.innerHTML = DOMPurify.sanitize(raw, {
    ADD_ATTR: ['target', 'rel']
  });

  preview.querySelectorAll('pre code').forEach((block) => {
    hljs.highlightElement(block);
  });
}

function setFile(payload) {
  currentDirectory = payload.directory;
  currentDirectoryUrl = payload.directoryUrl;
  renderMarkdown(payload.content);
}

function showError(message) {
  renderMarkdown(`# 打开失败\n\n> ${message}`);
}

openButton.addEventListener('click', () => {
  window.xpmd.openMarkdown();
});

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
