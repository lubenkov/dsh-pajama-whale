import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

const fail = (message) => failures.push(message);
const read = (path) => readFileSync(join(root, path), 'utf8');
const exists = (path) => existsSync(join(root, path));

const pkg = JSON.parse(read('package.json'));
if (!/^\d+\.\d+\.\d+/.test(pkg.version)) fail('package.json: bad version');
if (!pkg.dsh?.bundle?.patch) fail('package.json: missing dsh.bundle.patch');
if (!pkg.engines?.dsh) fail('package.json: missing engines.dsh');
if (!/0\.2\.1/.test(pkg.engines?.dsh ?? '')) fail('package.json: unexpected engines.dsh range');
if (!/<0\.3\.0-0/.test(pkg.engines?.dsh ?? '')) fail('package.json: range must exclude 0.3.0 prereleases');
for (const file of ['index.js', 'client.js', 'cordis.patch.yml', 'LICENSE', 'README.md']) {
  if (!exists(file)) fail(`missing ${file}`);
}

if (pkg.icon !== './assets/icon.png') fail('package.json: unexpected icon path');
if (!pkg.exports?.['./icon']) fail('package.json: missing ./icon export');
if (!pkg.exports?.['./locale/*.json']) fail('package.json: missing locale export');
if (pkg.files?.some((entry) => String(entry).startsWith('assets/build'))) {
  fail('package.json: packed sprite strips must not be shipped; client.js already inlines them');
}

const iconPath = join(root, 'assets/icon.png');
if (!existsSync(iconPath)) {
  fail('missing assets/icon.png');
} else {
  const icon = readFileSync(iconPath);
  if (icon.length > 256 * 1024) fail(`icon is ${icon.length} bytes, above the 256 KiB limit`);
  if (icon.toString('latin1', 1, 4) !== 'PNG') fail('icon is not a PNG');
  const width = icon.readUInt32BE(16);
  const height = icon.readUInt32BE(20);
  if (width < 64 || height < 64 || width > 1024 || height > 1024) {
    fail(`icon dimensions ${width}x${height} are outside 64..1024`);
  }
}

if (!pkg.files?.includes('docs/preview.png')) {
  fail('package.json: docs/preview.png is not shipped');
}
if (!exists('docs/preview.png')) {
  fail('missing docs/preview.png');
} else if (statSync(join(root, 'docs/preview.png')).size < 1000) {
  fail('docs/preview.png is empty');
}

for (const demo of ['docs/demo.gif', 'docs/demo-working.gif']) {
  if (!exists(demo)) {
    fail(`missing ${demo}`);
    continue;
  }
  const bytes = statSync(join(root, demo)).size;
  if (bytes > 2_500_000) fail(`${demo} is ${bytes} bytes, above the 2.5 MB budget`);
  if (readFileSync(join(root, demo)).toString('latin1', 0, 4) !== 'GIF8') {
    fail(`${demo} is not a GIF`);
  }
}

if (!exists('screenshots.json')) {
  fail('missing screenshots.json');
} else {
  const shots = JSON.parse(read('screenshots.json'));
  const list = Array.isArray(shots) ? shots : shots.screenshots;
  if (!Array.isArray(list) || list.length < 1 || list.length > 8) {
    fail('screenshots.json: expected 1 to 8 images');
  } else {
    for (const shot of list) {
      if (typeof shot !== 'string') {
        fail('screenshots.json: every path must be a string');
        continue;
      }
      if (shot.startsWith('/') || shot.includes('..')) {
        fail(`screenshots.json: "${shot}" must stay inside the repository`);
        continue;
      }
      if (!/\.(png|jpe?g|webp)$/i.test(shot)) {
        fail(`screenshots.json: "${shot}" is not a supported image`);
        continue;
      }
      if (!exists(shot)) {
        fail(`screenshots.json: missing ${shot}`);
        continue;
      }
      if (statSync(join(root, shot)).size > 700 * 1024) {
        fail(`screenshots.json: ${shot} is above 700 KiB`);
      }
    }
  }
}

for (const locale of ['en', 'zh']) {
  const path = `locale/${locale}.json`;
  if (!exists(path)) {
    fail(`missing ${path}`);
    continue;
  }
  const data = JSON.parse(read(path));
  if (!data.meta?.title) fail(`${path}: missing meta.title`);
  if (!data.meta?.description) fail(`${path}: missing meta.description`);
}

const manifest = JSON.parse(read('assets/build/manifest.json'));
const expectedSquash = ['up', 'right', 'left', 'down'];
const expectedEmotions = [
  'blink',
  'tail_wag',
  'joy',
  'thinking',
  'working',
  'surprised',
  'yawn',
  'sleepy',
];
if (manifest.cell?.join('x') !== '288x361') fail('manifest: unexpected cell size');

for (const direction of expectedSquash) {
  const entry = manifest.squash?.[direction];
  if (entry !== 8) fail(`manifest: squash ${direction} should have 8 frames`);
  const file = `assets/build/squash-${direction}.webp`;
  if (!exists(file) || statSync(join(root, file)).size < 1000) fail(`missing ${file}`);
}

for (const name of expectedEmotions) {
  const entry = manifest.emotions?.[name];
  if (!entry || !entry.frames) fail(`manifest: emotion ${name} missing`);
  const file = `assets/build/emo-${name}.webp`;
  if (!exists(file) || statSync(join(root, file)).size < 1000) fail(`missing ${file}`);
}

const client = read('client.js');
if (!client.includes('__ModuleLoader__')) fail('client.js: not a client module');
if (client.includes('__SHEET_')) fail('client.js: unresolved sheet placeholder');
const dataUris = client.match(/data:image\/webp;base64,/g)?.length ?? 0;
if (dataUris !== 12) fail(`client.js: expected 12 inlined sheets, found ${dataUris}`);
const clientBytes = statSync(join(root, 'client.js')).size;
if (clientBytes > 4_000_000) fail(`client.js: ${clientBytes} bytes exceeds the 4 MB budget`);

const source = read('src/client.src.js');
const dictStart = source.indexOf('const LOCALE_DICT = {');
const dictEnd = source.indexOf('const THOUGHTS');
if (dictStart < 0 || dictEnd < 0) fail('source: locale dictionary not found');
const dict = source.slice(dictStart, dictEnd);
const enStart = dict.indexOf('en: {');
const zhStart = dict.indexOf('zh: {');
if (enStart < 0 || zhStart < 0) fail('source: en/zh dictionaries not found');

const keysOf = (text) => new Set([...text.matchAll(/'([^']+)':/g)].map((match) => match[1]));
const en = keysOf(dict.slice(enStart, zhStart));
const zh = keysOf(dict.slice(zhStart));
for (const key of en) if (!zh.has(key)) fail(`locale: zh is missing "${key}"`);
for (const key of zh) if (!en.has(key)) fail(`locale: en is missing "${key}"`);

const used = new Set(
  [...source.matchAll(/'((?:status|context|break|aria|thought)\.[A-Za-z.]+)'/g)].map(
    (match) => match[1],
  ),
);
for (const key of used) if (!en.has(key)) fail(`locale: used key "${key}" is missing from en`);

if (failures.length > 0) {
  console.error('Validation failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log(
  `OK: ${expectedSquash.length + expectedEmotions.length} sheets, ` +
    `${en.size} locale keys, client ${(clientBytes / 1024 / 1024).toFixed(2)} MB`,
);
