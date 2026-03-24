#!/usr/bin/env node
/**
 * CSS Build Script
 * Compiles src/styles/main.css to public/css/main.css with all imports resolved
 */

import postcss from 'postcss';
import postcssImport from 'postcss-import';
import autoprefixer from 'autoprefixer';
import postcssPresetEnv from 'postcss-preset-env';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// scripts/build -> project root
const projectRoot = resolve(__dirname, '../..');

async function buildCSS() {
  const inputFile = resolve(projectRoot, 'src/styles/main.css');
  const outputFile = resolve(projectRoot, 'public/css/main.css');

  // Ensure output directory exists
  mkdirSync(resolve(projectRoot, 'public/css'), { recursive: true });

  try {
    const inputCSS = readFileSync(inputFile, 'utf8');

    const result = await postcss([
      postcssImport({
        path: [resolve(projectRoot, 'src/styles')]
      }),
      autoprefixer({
        overrideBrowserslist: ['>0.2%', 'not dead', 'not op_mini all', 'last 2 versions']
      }),
      postcssPresetEnv({
        stage: 3,
        features: {
          'custom-properties': true,
          'nesting-rules': true,
          'focus-visible-pseudo-class': true,
          'not-pseudo-class': true,
          'color-functional-notation': false,
          'double-position-gradients': false
        }
      })
    ]).process(inputCSS, {
      from: inputFile,
      to: outputFile,
      map: { inline: true }
    });

    writeFileSync(outputFile, result.css);
    console.log(`✓ CSS built successfully: ${outputFile}`);
    console.log(`  Output size: ${(result.css.length / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error('✗ CSS build failed:', error.message);
    if (error.file) {
      console.error(`  File: ${error.file}`);
    }
    if (error.line) {
      console.error(`  Line: ${error.line}:${error.column}`);
    }
    process.exit(1);
  }
}

buildCSS();
