#!/usr/bin/env node

/**
 * Build Script for SutraKala
 * Handles production build with optimization
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..', '..');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command) {
  try {
    execSync(command, { stdio: 'inherit', cwd: ROOT_DIR });
    return true;
  } catch (error) {
    log(`Error executing: ${command}`, 'red');
    throw error;
  }
}

async function main() {
  log('\n🚀 Starting production build...\n', 'blue');

  const env = process.env.NODE_ENV || 'production';
  log(`Environment: ${env}`, 'yellow');

  // Step 1: Clean previous builds
  log('\n📦 Step 1/6: Cleaning previous builds...', 'blue');
  if (existsSync(join(ROOT_DIR, 'public', 'css'))) {
    rmSync(join(ROOT_DIR, 'public', 'css'), { recursive: true });
  }
  if (existsSync(join(ROOT_DIR, 'public', 'js'))) {
    rmSync(join(ROOT_DIR, 'public', 'js'), { recursive: true });
  }
  log('✓ Clean complete', 'green');

  // Step 2: Install dependencies
  log('\n📦 Step 2/6: Checking dependencies...', 'blue');
  exec('npm ci --only=production');
  log('✓ Dependencies verified', 'green');

  // Step 3: Build CSS
  log('\n🎨 Step 3/6: Building CSS...', 'blue');
  exec('npx postcss src/styles/main.css -o public/css/main.css --env production');
  log('✓ CSS built', 'green');

  // Step 4: Build JavaScript
  log('\n⚡ Step 4/6: Building JavaScript...', 'blue');
  exec('npx rollup -c config/rollup.config.js');
  log('✓ JavaScript built', 'green');

  // Step 5: Optimize images
  log('\n🖼️  Step 5/6: Optimizing images...', 'blue');
  try {
    exec('node scripts/build/optimize-images.js');
    log('✓ Images optimized', 'green');
  } catch (error) {
    log('⚠ Image optimization skipped (sharp not available)', 'yellow');
  }

  // Step 6: Minify assets
  log('\n🗜️  Step 6/6: Minifying assets...', 'blue');
  exec('npx cleancss -o public/css/main.min.css public/css/main.css');
  exec('npx terser public/js/main.js -o public/js/main.min.js -c -m --source-map "content=public/js/main.js.map,url=main.min.js.map"');
  log('✓ Assets minified', 'green');

  // Generate build info
  const buildInfo = {
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    environment: env,
    commit: process.env.GITHUB_SHA || 'local'
  };

  // Write build info
  const { writeFileSync } = await import('fs');
  writeFileSync(
    join(ROOT_DIR, 'public', 'build-info.json'),
    JSON.stringify(buildInfo, null, 2)
  );

  log('\n✅ Build completed successfully!\n', 'green');
  log(`Version: ${buildInfo.version}`, 'yellow');
  log(`Timestamp: ${buildInfo.timestamp}`, 'yellow');
  log(`Environment: ${buildInfo.environment}`, 'yellow');
  log('\nOutput directory: public/', 'blue');
}

main().catch((error) => {
  log('\n❌ Build failed!', 'red');
  console.error(error);
  process.exit(1);
});
