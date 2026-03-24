#!/usr/bin/env node
/**
 * Post-build script
 * Copies built assets from public/ to root directory for Firebase hosting
 */

import { copyFileSync, mkdirSync, rmSync, readdirSync, lstatSync, existsSync } from 'fs';
import { dirname, resolve, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');

function copyFile(src, dest, label) {
  try {
    copyFileSync(src, dest);
    console.log(`✓ Copied ${label}`);
  } catch (error) {
    console.error(`✗ Failed to copy ${label}:`, error.message);
    process.exit(1);
  }
}

function copyDirectoryRecursive(srcDir, destDir, baseDir = '') {
  const entries = readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = resolve(srcDir, entry.name);
    const destPath = resolve(destDir, entry.name);
    const relativePath = baseDir ? `${baseDir}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      mkdirSync(destPath, { recursive: true });
      copyDirectoryRecursive(srcPath, destPath, relativePath);
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.map'))) {
      copyFile(srcPath, destPath, `js/${relativePath}`);
    }
  }
}

// Clean root css and js directories
const rootCssDir = resolve(projectRoot, 'css');
const rootJsDir = resolve(projectRoot, 'js');

try {
  rmSync(rootCssDir, { recursive: true, force: true });
  rmSync(rootJsDir, { recursive: true, force: true });
  console.log('✓ Cleaned root css/ and js/ directories');
} catch (error) {
  console.error('Warning: Could not clean directories:', error.message);
}

// Create directories
mkdirSync(rootCssDir, { recursive: true });
mkdirSync(rootJsDir, { recursive: true });

// Copy CSS
copyFile(
  resolve(projectRoot, 'public/css/main.css'),
  resolve(projectRoot, 'css/main.css'),
  'css/main.css'
);

// Copy entire JS directory recursively from public
const publicJsDir = resolve(projectRoot, 'public/js');
copyDirectoryRecursive(publicJsDir, rootJsDir);

// ===== COPY AUTH MODULE FILES FROM SRC =====
// These files are not bundled by Rollup and need to be copied with correct structure

// 1. Copy auth-init.js to root js/ (overwrites any from public)
const authInitSrc = resolve(projectRoot, 'src/features/authentication/auth-init.js');
const authInitDest = resolve(rootJsDir, 'auth-init.js');
copyFile(authInitSrc, authInitDest, 'js/auth-init.js (from src)');

// 2. Copy config files
const configSrcDir = resolve(projectRoot, 'src/config');
const configDestDir = resolve(rootJsDir, 'config');
mkdirSync(configDestDir, { recursive: true });

const configFiles = ['firebase-init.js', 'firebase-config.js'];
for (const file of configFiles) {
  const src = resolve(configSrcDir, file);
  const dest = resolve(configDestDir, file);
  try {
    copyFile(src, dest, `js/config/${file}`);
  } catch (error) {
    console.error(`Warning: Could not copy ${file}:`, error.message);
  }
}

// 3. Copy features directory structure
const featuresDestDir = resolve(rootJsDir, 'features');
mkdirSync(featuresDestDir, { recursive: true });

// 3a. Copy auth-helpers.js (optional - may not exist in all builds)
const authHelpersSrc = resolve(projectRoot, 'src/features/auth-helpers.js');
const authHelpersDest = resolve(featuresDestDir, 'auth-helpers.js');
try {
  copyFileSync(authHelpersSrc, authHelpersDest);
  console.log('✓ Copied js/features/auth-helpers.js');
} catch (error) {
  console.log('⊘ Skipped js/features/auth-helpers.js (not found)');
}

// 3b. Copy auth-errors.js (optional)
const authErrorsSrc = resolve(projectRoot, 'src/utils/auth-errors.js');
const authErrorsDest = resolve(featuresDestDir, 'auth-errors.js');
try {
  copyFileSync(authErrorsSrc, authErrorsDest);
  console.log('✓ Copied js/features/auth-errors.js');
} catch (error) {
  console.log('⊘ Skipped js/features/auth-errors.js (not found)');
}

// 3c. Copy authentication/ subdirectory
const authSrcDir = resolve(projectRoot, 'src/features/authentication');
const authDestDir = resolve(featuresDestDir, 'authentication');
mkdirSync(authDestDir, { recursive: true });

const authFiles = [
  'auth-init.js',
  'auth-manager.js',
  'auth-ui.js',
  'login-modal.js',
  'login-page.js',
  'otp-input.js',
  'phone-input.js'
];

for (const file of authFiles) {
  const src = resolve(authSrcDir, file);
  const dest = resolve(authDestDir, file);
  try {
    copyFile(src, dest, `js/features/authentication/${file}`);
  } catch (error) {
    console.error(`Warning: Could not copy ${file}:`, error.message);
  }
}

// 3d. Copy firestore/ subdirectory
const firestoreSrcDir = resolve(projectRoot, 'src/features/firestore');
const firestoreDestDir = resolve(featuresDestDir, 'firestore');
mkdirSync(firestoreDestDir, { recursive: true });

const firestoreFiles = ['user-service.js'];
for (const file of firestoreFiles) {
  const src = resolve(firestoreSrcDir, file);
  const dest = resolve(firestoreDestDir, file);
  try {
    copyFile(src, dest, `js/features/firestore/${file}`);
  } catch (error) {
    console.error(`Warning: Could not copy ${file}:`, error.message);
  }
}

// 4. Copy utils directory
const utilsSrcDir = resolve(projectRoot, 'src/utils');
const utilsDestDir = resolve(rootJsDir, 'utils');
mkdirSync(utilsDestDir, { recursive: true });

const utilsFiles = [
  'animation.js',
  'cart-sync.js',
  'dom.js',
  'performance-traces.js',
  'storage.js',
  'toast.js'
];

for (const file of utilsFiles) {
  const src = resolve(utilsSrcDir, file);
  const dest = resolve(utilsDestDir, file);
  try {
    copyFile(src, dest, `js/utils/${file}`);
  } catch (error) {
    // Some files might not exist, that's ok
  }
}

console.log('\n✓ Post-build copy complete!');

// ===== COPY ASSETS TO PUBLIC FOR VERCEL =====
// Vercel doesn't follow symlinks, so we need to copy assets to public/assets
const assetsSrc = resolve(projectRoot, 'assets');
const assetsDest = resolve(projectRoot, 'public/assets');

function copyDirectoryRecursiveAll(srcDir, destDir) {
  // Remove symlink or existing directory
  if (existsSync(destDir)) {
    const stat = lstatSync(destDir);
    if (stat.isSymbolicLink() || stat.isDirectory()) {
      rmSync(destDir, { recursive: true, force: true });
    }
  }
  
  mkdirSync(destDir, { recursive: true });
  
  const entries = readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(srcDir, entry.name);
    const destPath = join(destDir, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectoryRecursiveAll(srcPath, destPath);
    } else if (entry.isFile()) {
      copyFileSync(srcPath, destPath);
    }
  }
}

try {
  copyDirectoryRecursiveAll(assetsSrc, assetsDest);
  console.log('✓ Copied assets/ to public/assets/ for Vercel deployment');
} catch (error) {
  console.error('Warning: Could not copy assets:', error.message);
}
