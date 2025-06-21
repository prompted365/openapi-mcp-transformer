#!/usr/bin/env node

/**
 * Simplified OpenAPI MCP Server
 * A basic implementation that works immediately without complex builds
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import axios from 'axios';
import { load } from 'js-yaml';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

// Get OpenAPI spec URL from command line
const specUrl = process.argv[2] || 'https://petstore3.swagger.io/api/v3/openapi.json';

console.error(`Loading OpenAPI spec from: ${specUrl}`);

async function loadSpec(url) {
  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const response = await axios.get(url);
      return response.data;
    } else {
      const content = await readFile(resolve(process.cwd(), url), 'utf-8');
      return url.endsWith('.yaml') || url.endsWith('.yml') 
        ? load(content)
        : JSON.parse(content);
    }
  } catch (error) {
    console.error('Failed to load OpenAPI spec:', error.message);
    throw error;
  }
}

async function main() {
  try {
    // Load the OpenAPI spec
    const spec = await loadSpec(specUrl);
    console.error(`Loaded API: ${spec.info.title} v${spec.info.version}`);
    
    // Create MCP server
    const server = new Server({
      name: `${spec.info.title} (OpenAPI)`,
      version: spec.info.version || '1.0.0'
    }, {
      capabilities: {
        tools: {},
        resources: {}
      }
    });
    
    // Generate tools from paths
    const tools = [];
    for (const [path, pathItem] of Object.entries(spec.paths || {})) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (['get', 'post', 'put', 'delete', 'patch'].includes(method) && typeof operation === 'object') {
          const toolName = operation.operationId || 
            `${method}_${path.replace(/[{}]/g, '').replace(/[^a-zA-Z0-9]/g, '_')}`;
          
          tools.push({
            name: toolName,
            description: operation.summary || `${method.toUpperCase()} ${path}`,
            inputSchema: {
              type: 'object',
              properties: {
                parameters: {
                  type: 'object',
                  description: 'Path and query parameters'
                },
                body: {
                  type: 'object',
                  description: 'Request body (for POST/PUT/PATCH)'
                }
              }
            }
          });
        }
      }
    }
    
    console.error(`Generated ${tools.length} tools from OpenAPI spec`);
    
    // Resources from schemas
    const resources = [];
    if (spec.components?.schemas) {
      for (const [name, schema] of Object.entries(spec.components.schemas)) {
        resources.push({
          uri: `schema://${name}`,
          name: `${name} Schema`,
          description: `Schema definition for ${name}`,
          mimeType: 'application/json'
        });
      }
    }
    
    console.error(`Generated ${resources.length} resources from OpenAPI spec`);
    
    // Set up request handlers using the new format
    server.setRequestHandler(
      {
        method: 'tools/list',
        params: {}
      },
      async () => {
        console.error('Handling tools/list request');
        return { tools };
      }
    );
    
    server.setRequestHandler(
      {
        method: 'tools/call',
        params: {
          name: { type: 'string' },
          arguments: { type: 'object', optional: true }
        }
      },
      async (request) => {
        console.error(`Handling tools/call for: ${request.params.name}`);
        const { name, arguments: args } = request.params;
        
        // Find the tool
        const tool = tools.find(t => t.name === name);
        if (!tool) {
          throw new Error(`Tool not found: ${name}`);
        }
        
        // In a real implementation, this would make actual API calls
        // For now, return a mock response
        return {
          content: [{
            type: 'text',
            text: `Called ${name} with parameters: ${JSON.stringify(args || {})}\n\n` +
                  `This is a simplified OpenAPI MCP server. ` +
                  `In a full implementation, this would make actual API calls to ${spec.servers?.[0]?.url || 'the API'}.`
          }]
        };
      }
    );
    
    server.setRequestHandler(
      {
        method: 'resources/list',
        params: {}
      },
      async () => {
        console.error('Handling resources/list request');
        return { resources };
      }
    );
    
    server.setRequestHandler(
      {
        method: 'resources/read',
        params: {
          uri: { type: 'string' }
        }
      },
      async (request) => {
        console.error(`Handling resources/read for: ${request.params.uri}`);
        const { uri } = request.params;
        const schemaName = uri.replace('schema://', '');
        const schema = spec.components?.schemas?.[schemaName];
        
        if (!schema) {
          throw new Error(`Resource not found: ${uri}`);
        }
        
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(schema, null, 2)
          }]
        };
      }
    );
    
    // Connect to stdio transport
    console.error('Connecting to stdio transport...');
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error('OpenAPI MCP Server is running');
    console.error(`Available tools: ${tools.map(t => t.name).join(', ')}`);
    
    // Keep the process alive
    process.on('SIGINT', () => {
      console.error('Shutting down...');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Server error:', error);
    process.exit(1);
  }
}

// Run the server
main().catch(console.error);
