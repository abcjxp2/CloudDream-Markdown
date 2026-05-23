import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { resolveVendorTarget, vendorFiles } from './vendor-files.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const electronApp = path.join(rootDir, 'node_modules', 'electron', 'dist', 'Electron.app');
const releaseDir = path.join(rootDir, 'release');
const targetApp = path.join(releaseDir, 'XPMD.app');
const appResources = path.join(targetApp, 'Contents', 'Resources', 'app');
const iconPath = path.join(rootDir, 'assets', 'XPMD.icns');

const run = promisify(execFile);

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function copyVendorFiles() {
  for (const [source, target] of vendorFiles) {
    const targetPath = resolveVendorTarget(appResources, target);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await run('cp', [path.join(rootDir, source), targetPath]);
  }
}

async function patchInfoPlist() {
  const plistPath = path.join(targetApp, 'Contents', 'Info.plist');
  let plist = await fs.readFile(plistPath, 'utf8');

  plist = plist
    .replace(
      '<key>CFBundleDisplayName</key>\n\t<string>Electron</string>',
      '<key>CFBundleDisplayName</key>\n\t<string>XPMD</string>'
    )
    .replace(
      '<key>CFBundleName</key>\n\t<string>Electron</string>',
      '<key>CFBundleName</key>\n\t<string>XPMD</string>'
    )
    .replace(
      '<key>CFBundleIconFile</key>\n\t<string>electron.icns</string>',
      '<key>CFBundleIconFile</key>\n\t<string>XPMD.icns</string>'
    )
    .replace(
      '<key>CFBundleIdentifier</key>\n\t<string>com.github.Electron</string>',
      '<key>CFBundleIdentifier</key>\n\t<string>com.local.xpmd</string>'
    );

  const documentTypes = `
\t<key>CFBundleDocumentTypes</key>
\t<array>
\t\t<dict>
\t\t\t<key>CFBundleTypeExtensions</key>
\t\t\t<array>
\t\t\t\t<string>md</string>
\t\t\t\t<string>markdown</string>
\t\t\t\t<string>mdown</string>
\t\t\t\t<string>mkd</string>
\t\t\t</array>
\t\t\t<key>CFBundleTypeName</key>
\t\t\t<string>Markdown Document</string>
\t\t\t<key>CFBundleTypeRole</key>
\t\t\t<string>Viewer</string>
\t\t\t<key>LSHandlerRank</key>
\t\t\t<string>Alternate</string>
\t\t</dict>
\t</array>
`;

  if (!plist.includes('CFBundleDocumentTypes')) {
    plist = plist.replace('\n</dict>', `${documentTypes}</dict>`);
  }

  await fs.writeFile(plistPath, plist);
}

async function main() {
  if (!(await pathExists(electronApp))) {
    throw new Error('Electron runtime not found. Run npm install first.');
  }
  if (!(await pathExists(iconPath))) {
    throw new Error('App icon not found. Run npm run build:icon first.');
  }

  await run('rm', ['-rf', releaseDir]);
  await fs.mkdir(releaseDir, { recursive: true });
  await run('cp', ['-R', electronApp, targetApp]);
  await run('cp', [iconPath, path.join(targetApp, 'Contents', 'Resources', 'XPMD.icns')]);

  await fs.rm(path.join(targetApp, 'Contents', 'Resources', 'default_app.asar'), { force: true });
  await fs.mkdir(appResources, { recursive: true });

  await run('cp', ['-R', path.join(rootDir, 'src'), path.join(appResources, 'src')]);
  await run('cp', [path.join(rootDir, 'package.json'), path.join(appResources, 'package.json')]);
  await copyVendorFiles();
  await patchInfoPlist();

  console.log(`Created ${targetApp}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
