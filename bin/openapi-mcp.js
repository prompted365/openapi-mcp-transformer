#!/usr/bin/env node

/**
 * Simplified executable wrapper for the OpenAPI MCP Transformer
 * This allows the package to work immediately with npx
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if TypeScript source exists (development mode)
const srcPath = join(__dirname, '..', 'src', 'cli', 'index.ts');
const distPath = join(__dirname, 'cli', 'index.js');

if (existsSync(distPath)) {
  // Production: Use compiled version
  import(distPath).catch(err => {
    console.error('Failed to load compiled CLI:', err);
    process.exit(1);
  });
} else if (existsSync(srcPath)) {
  // Development: Use tsx to run TypeScript directly
  const tsx = spawn('npx', ['tsx', srcPath, ...process.argv.slice(2)], {
    stdio: 'inherit',
    shell: true
  });
  
  tsx.on('exit', (code) => {
    process.exit(code || 0);
  });
} else {
  // Fallback: Basic MCP server
  console.log('OpenAPI MCP Transformer - Simplified Mode');
  console.log('Full transformer not available, starting basic MCP server...');
  
  // Import and start a basic MCP server
  import('./simple-server.js').catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
