import { Project } from 'ts-morph';
import fs from 'fs';

const project = new Project({ tsConfigFilePath: 'tsconfig.json' });

const mappings = [];
for (const sourceFile of project.getSourceFiles('src/**/*.ts')) {
  const symbols = sourceFile.getExportSymbols().map(s => s.getName());
  mappings.push({ file: sourceFile.getFilePath(), symbols });
}

fs.writeFileSync('symbol-map.json', JSON.stringify(mappings, null, 2));
console.log('Symbol map written to symbol-map.json');
