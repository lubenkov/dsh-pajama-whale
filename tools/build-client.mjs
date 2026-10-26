#!/usr/bin/env node
/**
 * Inlines the WebP sprite sheets into client.js as data URIs.
 *
 * Source sheets live in assets/build/ (produced from assets/sprites/ by
 * tools/build-sheets.py). The client half is a single browser module with no
 * filesystem access, so the artwork travels with the code.
 *
 *   node tools/build-client.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const SHEETS = {
  SHEET_SQ_UP: 'squash-up.webp',
  SHEET_SQ_RIGHT: 'squash-right.webp',
  SHEET_SQ_LEFT: 'squash-left.webp',
  SHEET_SQ_DOWN: 'squash-down.webp',
  SHEET_EMO_BLINK: 'emo-blink.webp',
  SHEET_EMO_TAIL_WAG: 'emo-tail_wag.webp',
  SHEET_EMO_JOY: 'emo-joy.webp',
};

const sourcePath = join(root, 'src', 'client.src.js');
const clientPath = join(root, 'client.js');
let source = readFileSync(sourcePath, 'utf8');
let total = 0;

for (const [name, file] of Object.entries(SHEETS)) {
  const bytes = readFileSync(join(root, 'assets', 'build', file));
  total += bytes.length;
  const dataUrl = `data:image/webp;base64,${bytes.toString('base64')}`;
  const pattern = new RegExp(`const ${name} = '[^']*';`);
  if (!pattern.test(source)) {
    throw new Error(`client.js: ${name} placeholder not found`);
  }
  source = source.replace(pattern, `const ${name} = '${dataUrl}';`);
}

writeFileSync(clientPath, source);
console.log(`inlined ${Object.keys(SHEETS).length} sheets, ${total} source bytes`);
