#!/usr/bin/env node

/**
 * CLI for OpenAPI MCP Transformer
 * 
 * Transform OpenAPI specs into intelligent MCP servers with a simple command
 */

import { Command } from 'commander';
import { readFile } from 'fs/promises';
import { load } from 'js-yaml';
import chalk from 'chalk';
import { OpenAPIMCPTransformer } from '../index.js';
import { TransformerConfig } from '../types/config.js';
import { logger, setLogLevel } from '../utils/logger.js';
import axios from 'axios';
import { existsSync } from 'fs';
import { resolve } from 'path';

const program = new Command();

program
  .name('openapi-mcp')
  .description('Transform OpenAPI specifications into intelligent MCP servers')
  .version('1.0.0')
  .argument('<spec>', 'OpenAPI specification file path or URL')
  .option('-c, --config <path>', 'Configuration file path')
  .option('-n, --name <name>', 'Server name (defaults to API title)')
  .option('-o, --output <path>', 'Output directory for generated server')
  .option('--no-sampling', 'Disable sampling/intelligence features')
  .option('--no-roots', 'Disable root-based context awareness')
  .option('--model <model>', 'LLM model for sampling', 'claude-3-opus')
  .option('--env <environment>', 'Target environment', 'development')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('--dry-run', 'Analyze spec without starting server')
  .action(async (specPath, options) => {
    try {
      console.log(chalk.blue.bold('\n🚀 OpenAPI MCP Transformer\n'));
      
      // Set log level
      if (options.verbose) {
        setLogLevel('debug');
      }
      
      // Load OpenAPI spec
      console.log(chalk.cyan('📄 Loading OpenAPI specification...'));
      const spec = await loadOpenAPISpec(specPath);
      console.log(chalk.green(`✓ Loaded: ${spec.info.title} v${spec.info.version}`));
      
      // Load configuration
      const config = await loadConfig(options);
      
      // Create transformer
      console.log(chalk.cyan('\n🔧 Analyzing API specification...'));
      const transformer = new OpenAPIMCPTransformer(spec, config);
      
      // Generate MCP server
      console.log(chalk.cyan('🏗️  Generating MCP server...'));
      const server = await transformer.generate();
      
      // Display analysis results
      displayAnalysisResults(spec, config);
      
      if (options.dryRun) {
        console.log(chalk.yellow('\n⚡ Dry run complete - server not started'));
        process.exit(0);
      }
      
      // Start server
      console.log(chalk.cyan('\n🚀 Starting MCP server...'));
      await transformer.start();
      
      console.log(chalk.green.bold('\n✨ MCP server is running!'));
      console.log(chalk.gray('\nPress Ctrl+C to stop the server'));
      
    } catch (error) {
      console.error(chalk.red.bold('\n❌ Error:'), error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// Additional commands

program
  .command('analyze <spec>')
  .description('Analyze an OpenAPI spec without generating a server')
  .option('-d, --detailed', 'Show detailed analysis')
  .action(async (specPath, options) => {
    try {
      console.log(chalk.blue.bold('\n🔍 OpenAPI Specification Analysis\n'));
      
      const spec = await loadOpenAPISpec(specPath);
      const { SpecAnalyzer } = await import('../core/spec-analyzer.js');
      
      const analyzer = new SpecAnalyzer(spec);
      const analysis = analyzer.analyze();
      
      displayDetailedAnalysis(spec, analysis, options.detailed);
      
    } catch (error) {
      console.error(chalk.red.bold('\n❌ Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize a configuration file')
  .option('-o, --output <path>', 'Output path', './mcp-config.js')
  .action(async (options) => {
    try {
      console.log(chalk.blue.bold('\n🎨 Creating configuration file\n'));
      
      const configTemplate = `module.exports = {
  // Server configuration
  serverName: 'My API MCP Server',
  serverVersion: '1.0.0',
  
  // Intelligence features
  intelligence: {
    sampling: {
      enabled: true,
      model: 'claude-3-opus',
      maxTokens: 1000
    },
    analysis: {
      workflowDetection: true,
      errorPatterns: true,
      optimization: true
    }
  },
  
  // Context handling
  context: {
    roots: {
      autoDetect: true,
      environments: ['dev', 'staging', 'prod'],
      tenantAware: true
    }
  },
  
  // Generation options
  generation: {
    tools: {
      composite: true,
      workflows: true,
      adaptive: true
    },
    resources: {
      documentation: true,
      examples: true,
      schemas: true
    },
    prompts: {
      workflows: true,
      debugging: true,
      migration: true
    }
  },
  
  // Adaptive features
  adaptive: {
    rootBasedCapabilities: true,
    contextAwareTools: true,
    dynamicResources: true
  },
  
  // Security
  security: {
    sanitizeSampling: true,
    compliance: ['GDPR'],
    auditLogging: true
  }
};`;
      
      await writeFile(options.output, configTemplate);
      console.log(chalk.green(`✓ Configuration file created: ${options.output}`));
      
    } catch (error) {
      console.error(chalk.red.bold('\n❌ Error:'), error.message);
      process.exit(1);
    }
  });

// Helper functions

async function loadOpenAPISpec(specPath: string): Promise<any> {
  let content: string;
  
  if (specPath.startsWith('http://') || specPath.startsWith('https://')) {
    // Load from URL
    const response = await axios.get(specPath);
    content = typeof response.data === 'string' 
      ? response.data 
      : JSON.stringify(response.data);
  } else {
    // Load from file
    const fullPath = resolve(process.cwd(), specPath);
    if (!existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }
    content = await readFile(fullPath, 'utf-8');
  }
  
  // Parse JSON or YAML
  if (specPath.endsWith('.yaml') || specPath.endsWith('.yml')) {
    return load(content);
  } else {
    return JSON.parse(content);
  }
}

async function loadConfig(options: any): Promise<TransformerConfig> {
  const baseConfig: TransformerConfig = {
    serverName: options.name,
    intelligence: {
      sampling: {
        enabled: options.sampling !== false,
        model: options.model
      }
    },
    context: {
      roots: {
        enabled: options.roots !== false
      }
    }
  };
  
  if (options.config) {
    try {
      const configPath = resolve(process.cwd(), options.config);
      const userConfig = await import(configPath);
      return { ...baseConfig, ...userConfig.default || userConfig };
    } catch (error) {
      logger.warn(`Failed to load config file: ${error.message}`);
    }
  }
  
  return baseConfig;
}

function displayAnalysisResults(spec: any, config: any): void {
  console.log(chalk.cyan('\n📊 Analysis Results:'));
  console.log(chalk.white(`  • API: ${spec.info.title} v${spec.info.version}`));
  console.log(chalk.white(`  • Endpoints: ${Object.keys(spec.paths || {}).length}`));
  console.log(chalk.white(`  • Schemas: ${Object.keys(spec.components?.schemas || {}).length}`));
  
  if (config.intelligence?.sampling?.enabled) {
    console.log(chalk.green(`  • Intelligence: Enabled (${config.intelligence.sampling.model})`));
  }
  
  if (config.context?.roots?.enabled !== false) {
    console.log(chalk.green(`  • Context Awareness: Enabled`));
  }
}

function displayDetailedAnalysis(spec: any, analysis: any, detailed: boolean): void {
  console.log(chalk.cyan('API Information:'));
  console.log(`  • Title: ${spec.info.title}`);
  console.log(`  • Version: ${spec.info.version}`);
  console.log(`  • Description: ${spec.info.description || 'N/A'}`);
  
  console.log(chalk.cyan('\nEndpoints:'));
  console.log(`  • Total: ${analysis.endpoints.length}`);
  console.log(`  • Actions: ${analysis.endpoints.filter(e => e.isAction).length}`);
  console.log(`  • Resources: ${analysis.endpoints.filter(e => e.isResource).length}`);
  
  console.log(chalk.cyan('\nCapabilities:'));
  for (const [capability, enabled] of Object.entries(analysis.capabilities)) {
    if (enabled) {
      console.log(chalk.green(`  ✓ ${capability}`));
    }
  }
  
  if (analysis.workflows.length > 0) {
    console.log(chalk.cyan('\nDetected Workflows:'));
    for (const workflow of analysis.workflows) {
      console.log(`  • ${workflow.name} (${workflow.type})`);
    }
  }
  
  if (detailed) {
    console.log(chalk.cyan('\nRelationships:'));
    for (const rel of analysis.relationships) {
      console.log(`  • ${rel.from} ${rel.type} ${rel.to}`);
    }
    
    console.log(chalk.cyan('\nError Patterns:'));
    for (const error of analysis.errorPatterns) {
      console.log(`  • ${error.statusCode}: ${error.endpoint}`);
    }
  }
  
  console.log(chalk.cyan('\nMCP Features:'));
  console.log(`  • Tools: ${analysis.hasTools ? 'Yes' : 'No'}`);
  console.log(`  • Resources: ${analysis.hasResources ? 'Yes' : 'No'}`);
  console.log(`  • Prompts: ${analysis.hasPrompts ? 'Yes' : 'No'}`);
  console.log(`  • Sampling Recommended: ${analysis.requiresSampling ? 'Yes' : 'No'}`);
}

// Parse arguments
program.parse();
