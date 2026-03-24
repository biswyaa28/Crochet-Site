#!/usr/bin/env node

/**
 * Image Optimization Script
 * Compresses and converts images to WebP format
 */

import { readdirSync, existsSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..', '..');
const IMAGES_DIR = join(ROOT_DIR, 'public', 'assets', 'images');

// Try to import sharp, skip if not available
let sharp;
try {
  sharp = (await import('sharp')).default;
} catch (error) {
  console.log('Sharp not available, skipping image optimization');
  process.exit(0);
}

const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png'];
const QUALITY = 75;

async function optimizeImage(inputPath, outputPath) {
  try {
    await sharp(inputPath)
      .webp({ quality: QUALITY })
      .toFile(outputPath);

    const inputStats = await sharp(inputPath).metadata();
    const outputStats = await sharp(outputPath).metadata();

    const savings = ((inputStats.size - outputStats.size) / inputStats.size * 100).toFixed(2);
    console.log(`✓ Optimized: ${inputPath.split('/').pop()} (${savings}% savings)`);
  } catch (error) {
    console.error(`✗ Failed to optimize: ${inputPath}`, error.message);
  }
}

async function processDirectory(dir) {
  const files = readdirSync(dir);

  for (const file of files) {
    const filePath = join(dir, file);
    const ext = extname(file).toLowerCase();

    if (SUPPORTED_FORMATS.includes(ext)) {
      const webpPath = filePath.replace(ext, '.webp');
      await optimizeImage(filePath, webpPath);
    }
  }
}

async function main() {
  console.log('\n🖼️  Starting image optimization...\n');

  if (!existsSync(IMAGES_DIR)) {
    console.log('Images directory not found, creating...');
    mkdirSync(IMAGES_DIR, { recursive: true });
  }

  await processDirectory(IMAGES_DIR);

  console.log('\n✅ Image optimization complete!\n');
}

main().catch((error) => {
  console.error('Image optimization failed:', error);
  process.exit(1);
});
