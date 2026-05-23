import { marked } from './vendor/marked/marked.esm.js';
import hljs from './vendor/highlight/highlight.min.js';
import DOMPurify from './vendor/dompurify/purify.es.mjs';

const openButton = document.querySelector('#openButton');
const fileName = document.querySelector('#fileName');
const filePath = document.querySelector('#filePath');
const preview = document.querySelector('#preview');
const dropZone = document.querySelector('#dropZone');
let currentDirectory = null;
let currentDirectoryUrl = null;

const initialMarkdown = `# XPMD

把 Markdown 文件拖到窗口里，或点左侧按钮打开。

## 支持内容

- GitHub 风格 Markdown
- 表格、任务列表、引用
- 代码高亮
- 本地文件保存后自动刷新

| 操作 | 方式 |
|---|---|
| 打开文件 | Command+O |
| 拖拽文件 | 直接拖入窗口 |
| 缩放预览 | Command++ / Command+- |

\`\`\`js
const viewer = 'XPMD';
console.log(\`\${viewer} is ready.\`);
\`\`\`
`;

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
  fileName.textContent = payload.name;
  filePath.textContent = payload.filePath;
  renderMarkdown(payload.content);
}

function showError(message) {
  renderMarkdown(`# 打开失败\n\n> ${message}`);
}

openButton.addEventListener('click', () => {
  window.xpmd.openMarkdown();
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

  if (!/\.(md|markdown|mdown|mkd)$/i.test(file.path)) {
    showError('这里只接受 Markdown 文件。');
    return;
  }

  await window.xpmd.openPath(file.path);
});

window.xpmd.onMarkdownOpened(setFile);
window.xpmd.onMarkdownUpdated(setFile);
window.xpmd.onMarkdownError(showError);

renderMarkdown(initialMarkdown);
window.lucide.createIcons();
