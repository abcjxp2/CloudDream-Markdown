import path from 'node:path';

export const vendorFiles = [
  ['node_modules/marked/lib/marked.esm.js', 'marked/marked.esm.js'],
  ['node_modules/@highlightjs/cdn-assets/es/highlight.min.js', 'highlight/highlight.min.js'],
  ['node_modules/@highlightjs/cdn-assets/styles/github.min.css', 'highlight/github.min.css'],
  ['node_modules/@highlightjs/cdn-assets/styles/github-dark.min.css', 'highlight/github-dark.min.css'],
  ['node_modules/dompurify/dist/purify.es.mjs', 'dompurify/purify.es.mjs'],
];

export function resolveVendorTarget(baseDir, target) {
  return path.join(baseDir, 'src', 'renderer', 'vendor', target);
}
