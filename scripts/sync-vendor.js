import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { resolveVendorTarget, vendorFiles } from './vendor-files.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = promisify(execFile);

for (const [source, target] of vendorFiles) {
  const targetPath = resolveVendorTarget(rootDir, target);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await run('cp', [path.join(rootDir, source), targetPath]);
}

console.log('Vendor files synced.');
