/**
 * OpenAPI MCP Transformer
 * 
 * Transform OpenAPI specifications into intelligent, context-aware MCP servers
 * that go beyond simple tool mapping to create truly autonomous API agents.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { OpenAPISpec } from './types/openapi.js';
import { SpecAnalyzer } from './core/spec-analyzer.js';
import { ContextManager } from './core/context-manager.js';
import { IntelligenceEngine } from './core/intelligence-engine.js';
import { ToolGenerator } from './generators/tool-generator.js';
import { ResourceGenerator } from './generators/resource-generator.js';
import { PromptGenerator } from './generators/prompt-generator.js';
import { ExecutionEngine } from './core/execution-engine.js';
import { logger } from './utils/logger.js';
import { TransformerConfig } from './types/config.js';

export class OpenAPIMCPTransformer {
  private spec: OpenAPISpec;
  private config: TransformerConfig;
  private server: Server;
  private specAnalyzer: SpecAnalyzer;
  private contextManager: ContextManager;
  private intelligenceEngine: IntelligenceEngine;
  private executionEngine: ExecutionEngine;

  constructor(spec: OpenAPISpec, config: TransformerConfig) {
    this.spec = spec;
    this.config = config;
    
    // Initialize core components
    this.specAnalyzer = new SpecAnalyzer(spec);
    this.contextManager = new ContextManager(config);
    this.intelligenceEngine = new IntelligenceEngine(config);
    this.executionEngine = new ExecutionEngine(spec, this.contextManager, this.intelligenceEngine);
    
    // Create MCP server with capabilities based on analysis
    const capabilities = this.determineCapabilities();
    
    this.server = new Server({
      name: config.serverName || `${spec.info.title} MCP Server`,
      version: config.serverVersion || spec.info.version
    }, {
      capabilities
    });
    
    logger.info('OpenAPI MCP Transformer initialized', {
      apiTitle: spec.info.title,
      apiVersion: spec.info.version,
      capabilities
    });
  }

  /**
   * Analyze the spec and determine server capabilities
   */
  private determineCapabilities() {
    const analysis = this.specAnalyzer.analyze();
    
    return {
      tools: analysis.hasTools ? {} : undefined,
      resources: analysis.hasResources ? {} : undefined,
      prompts: analysis.hasPrompts ? {} : undefined,
      sampling: this.config.intelligence?.sampling?.enabled ? {} : undefined
    };
  }

  /**
   * Generate and register all MCP components
   */
  async generate(): Promise<Server> {
    logger.info('Starting OpenAPI to MCP transformation');
    
    // Analyze the specification
    const analysis = this.specAnalyzer.analyze();
    logger.info('Spec analysis complete', { analysis });
    
    // Generate tools
    if (analysis.hasTools) {
      const toolGenerator = new ToolGenerator(
        this.spec,
        this.contextManager,
        this.intelligenceEngine
      );
      const tools = await toolGenerator.generateTools(analysis);
      this.registerTools(tools);
      logger.info(`Generated ${tools.length} tools`);
    }
    
    // Generate resources
    if (analysis.hasResources) {
      const resourceGenerator = new ResourceGenerator(
        this.spec,
        this.contextManager
      );
      const resources = await resourceGenerator.generateResources(analysis);
      this.registerResources(resources);
      logger.info(`Generated ${resources.length} resources`);
    }
    
    // Generate prompts
    if (analysis.hasPrompts) {
      const promptGenerator = new PromptGenerator(
        this.spec,
        this.contextManager,
        this.intelligenceEngine
      );
      const prompts = await promptGenerator.generatePrompts(analysis);
      this.registerPrompts(prompts);
      logger.info(`Generated ${prompts.length} prompts`);
    }
    
    // Set up root handling
    this.setupRootHandling();
    
    // Set up sampling if enabled
    if (this.config.intelligence?.sampling?.enabled) {
      this.setupSampling();
    }
    
    logger.info('MCP server generation complete');
    return this.server;
  }

  /**
   * Register generated tools with the server
   */
  private registerTools(tools: any[]) {
    for (const tool of tools) {
      this.server.setRequestHandler(
        tool.schema,
        async (request, extra) => {
          logger.debug(`Tool invoked: ${tool.name}`, { request });
          
          // Use execution engine for intelligent execution
          const result = await this.executionEngine.executeTool(
            tool,
            request,
            extra
          );
          
          return result;
        }
      );
    }
  }

  /**
   * Register generated resources with the server
   */
  private registerResources(resources: any[]) {
    this.server.setRequestHandler(
      'resources/list',
      async () => ({
        resources: resources.map(r => ({
          uri: r.uri,
          name: r.name,
          description: r.description,
          mimeType: r.mimeType
        }))
      })
    );
    
    this.server.setRequestHandler(
      'resources/read',
      async (request) => {
        const resource = resources.find(r => r.uri === request.params.uri);
        if (!resource) {
          throw new Error(`Resource not found: ${request.params.uri}`);
        }
        
        // Dynamic content generation for some resources
        const content = await this.executionEngine.getResourceContent(resource);
        
        return {
          contents: [{
            uri: resource.uri,
            text: content,
            mimeType: resource.mimeType
          }]
        };
      }
    );
  }

  /**
   * Register generated prompts with the server
   */
  private registerPrompts(prompts: any[]) {
    this.server.setRequestHandler(
      'prompts/list',
      async () => ({
        prompts: prompts.map(p => ({
          name: p.name,
          description: p.description,
          arguments: p.arguments
        }))
      })
    );
    
    this.server.setRequestHandler(
      'prompts/get',
      async (request) => {
        const prompt = prompts.find(p => p.name === request.params.name);
        if (!prompt) {
          throw new Error(`Prompt not found: ${request.params.name}`);
        }
        
        // Generate dynamic prompt based on context
        const messages = await this.executionEngine.generatePromptMessages(
          prompt,
          request.params.arguments
        );
        
        return { messages };
      }
    );
  }

  /**
   * Set up root handling for context awareness
   */
  private setupRootHandling() {
    this.server.setRequestHandler(
      'roots/list',
      async () => {
        const roots = this.contextManager.getRoots();
        return { roots };
      }
    );
    
    // Handle root changes
    this.server.setNotificationHandler(
      'roots/listChanged',
      async (notification) => {
        logger.info('Roots changed', { roots: notification.params.roots });
        
        // Update context manager with new roots
        await this.contextManager.updateRoots(notification.params.roots);
        
        // Regenerate capabilities based on new context
        if (this.config.adaptive?.rootBasedCapabilities) {
          await this.adaptToNewRoots();
        }
      }
    );
  }

  /**
   * Set up sampling for intelligent decision making
   */
  private setupSampling() {
    this.server.setRequestHandler(
      'sampling/createMessage',
      async (request) => {
        logger.debug('Sampling request received', { request });
        
        // Forward to intelligence engine
        const result = await this.intelligenceEngine.handleSamplingRequest(
          request,
          this.contextManager.getCurrentContext()
        );
        
        return result;
      }
    );
  }

  /**
   * Adapt server capabilities based on new roots
   */
  private async adaptToNewRoots() {
    logger.info('Adapting to new root configuration');
    
    // Re-analyze with new context
    const analysis = this.specAnalyzer.analyzeWithContext(
      this.contextManager.getCurrentContext()
    );
    
    // Update available tools based on context
    if (this.config.adaptive?.contextAwareTools) {
      await this.updateContextAwareTools(analysis);
    }
    
    // Update resources based on available roots
    if (this.config.adaptive?.dynamicResources) {
      await this.updateDynamicResources(analysis);
    }
  }

  /**
   * Update tools based on current context
   */
  private async updateContextAwareTools(analysis: any) {
    const toolGenerator = new ToolGenerator(
      this.spec,
      this.contextManager,
      this.intelligenceEngine
    );
    
    // Generate context-specific tools
    const contextTools = await toolGenerator.generateContextAwareTools(
      analysis,
      this.contextManager.getCurrentContext()
    );
    
    // Register new tools
    this.registerTools(contextTools);
    
    logger.info(`Updated with ${contextTools.length} context-aware tools`);
  }

  /**
   * Update resources based on current roots
   */
  private async updateDynamicResources(analysis: any) {
    const resourceGenerator = new ResourceGenerator(
      this.spec,
      this.contextManager
    );
    
    // Generate resources based on available roots
    const dynamicResources = await resourceGenerator.generateDynamicResources(
      analysis,
      this.contextManager.getRoots()
    );
    
    // Register new resources
    this.registerResources(dynamicResources);
    
    logger.info(`Updated with ${dynamicResources.length} dynamic resources`);
  }

  /**
   * Start the MCP server
   */
  async start(transport?: any) {
    if (!transport) {
      transport = new StdioServerTransport();
    }
    
    logger.info('Starting MCP server');
    await this.server.connect(transport);
    
    logger.info('MCP server started successfully', {
      serverName: this.server.serverInfo.name,
      capabilities: this.server.serverInfo.capabilities
    });
  }
}

// Export for CLI usage
export { createCLI } from './cli/index.js';

// Export types
export * from './types/index.js';
