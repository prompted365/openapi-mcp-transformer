import fs from 'fs';

function load(path) {
  return JSON.parse(fs.readFileSync(path, 'utf-8'));
}

const [ , , basePath, targetPath ] = process.argv;
if (!basePath || !targetPath) {
  console.error('Usage: node scripts/refactor-impact.mjs <base> <target>');
  process.exit(1);
}

const base = load(basePath);
const target = load(targetPath);

const baseMap = new Map(base.map(m => [m.file, m.symbols]));
const targetMap = new Map(target.map(m => [m.file, m.symbols]));

const report = [];
for (const [file, symbols] of targetMap) {
  if (!baseMap.has(file)) {
    report.push(`Added file: ${file}`);
  } else {
    const baseSymbols = new Set(baseMap.get(file));
    const added = symbols.filter(s => !baseSymbols.has(s));
    const removed = [...baseSymbols].filter(s => !symbols.includes(s));
    if (added.length || removed.length) {
      report.push(`Modified symbols in ${file}`);
      if (added.length) report.push(`  Added: ${added.join(', ')}`);
      if (removed.length) report.push(`  Removed: ${removed.join(', ')}`);
    }
    baseMap.delete(file);
  }
}
for (const file of baseMap.keys()) {
  report.push(`Removed file: ${file}`);
}
fs.writeFileSync('refactor-impact.txt', report.join('\n'));
console.log('Refactor impact written to refactor-impact.txt');
