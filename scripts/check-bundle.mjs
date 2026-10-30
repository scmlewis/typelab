import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const ASSETS_DIR = path.resolve('dist', 'assets');

// Budgets are gzipped transfer sizes, which is what a browser downloads.
// Keep the initial bundle small; route-level chunks are allowed more room.
const BUDGETS = [
  { label: 'entry JS', test: (file) => /^index-.*\.js$/.test(file), maxKb: 160 },
  { label: 'all JS', test: (file) => file.endsWith('.js'), maxKb: 340 },
  { label: 'all CSS', test: (file) => file.endsWith('.css'), maxKb: 16 },
];

function kb(bytes) {
  return bytes / 1024;
}

function formatKb(bytes) {
  return `${kb(bytes).toFixed(1)} kB`;
}

const files = (await readdir(ASSETS_DIR)).filter((file) => !file.endsWith('.map'));
const sizes = new Map();

for (const file of files) {
  const contents = await readFile(path.join(ASSETS_DIR, file));
  sizes.set(file, gzipSync(contents, { level: 9 }).length);
}

console.log('Bundle budget (gzip)');
console.log(
  files
    .sort((a, b) => sizes.get(b) - sizes.get(a))
    .map((file) => `  ${file.padEnd(44)} ${formatKb(sizes.get(file)).padStart(9)}`)
    .join('\n'),
);

let failed = false;

for (const budget of BUDGETS) {
  const matching = files.filter(budget.test);
  const total = matching.reduce((sum, file) => sum + sizes.get(file), 0);
  const status = kb(total) <= budget.maxKb ? 'ok' : 'over';

  if (status === 'over') {
    failed = true;
  }

  console.log(
    `\n${status === 'ok' ? 'PASS' : 'FAIL'} ${budget.label}: ${formatKb(total)} / ${budget.maxKb} kB`,
  );
}

if (failed) {
  console.error('\nBundle budget exceeded.');
  process.exitCode = 1;
} else {
  console.log('\nAll bundle budgets met.');
}
