import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = promisify(execFile);
const pngPath = path.join(rootDir, 'assets', 'icon-1024.png');
const iconsetDir = path.join(rootDir, 'assets', 'YunmengMarkdown.iconset');
const icnsPath = path.join(rootDir, 'assets', 'YunmengMarkdown.icns');

const iconSizes = [
  ['icon_16x16.png', 16],
  ['icon_16x16@2x.png', 32],
  ['icon_32x32.png', 32],
  ['icon_32x32@2x.png', 64],
  ['icon_128x128.png', 128],
  ['icon_128x128@2x.png', 256],
  ['icon_256x256.png', 256],
  ['icon_256x256@2x.png', 512],
  ['icon_512x512.png', 512],
  ['icon_512x512@2x.png', 1024]
];

async function main() {
  await run('python3', [path.join(rootDir, 'scripts', 'render-icon.py')]);

  await fs.rm(iconsetDir, { recursive: true, force: true });
  await fs.mkdir(iconsetDir, { recursive: true });

  for (const [name, size] of iconSizes) {
    await run('sips', ['-z', String(size), String(size), pngPath, '--out', path.join(iconsetDir, name)]);
  }

  await run('iconutil', ['-c', 'icns', iconsetDir, '-o', icnsPath]);
  await fs.rm(iconsetDir, { recursive: true, force: true });
  console.log(`Created ${icnsPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
