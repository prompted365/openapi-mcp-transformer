/**
 * ContextManager - Manages multi-dimensional context from roots
 * 
 * Handles:
 * - Root interpretation and categorization
 * - Environment detection
 * - Multi-tenant context
 * - Dynamic capability adjustment
 */

import { TransformerConfig } from '../types/config.js';
import { logger } from '../utils/logger.js';

interface Root {
  uri: string;
  name: string;
}

interface APIContext {
  environment: 'development' | 'staging' | 'production' | 'local' | 'unknown';
  tenant?: string;
  roots: Root[];
  capabilities: Set<string>;
  configuration: Map<string, any>;
  apiClients: Map<string, any>;
  metadata: Map<string, any>;
  operationHistory: string[];
  sessionId: string;
  compliance?: string[];
  rateLimits?: Map<string, any>;
}

export class ContextManager {
  private config: TransformerConfig;
  private contexts: Map<string, APIContext> = new Map();
  private activeContextId: string = 'default';
  private rootHandlers: Map<string, (root: Root) => Promise<void>> = new Map();

  constructor(config: TransformerConfig) {
    this.config = config;
    
    // Initialize default context
    this.contexts.set('default', this.createDefaultContext());
    
    // Register root handlers
    this.registerRootHandlers();
    
    logger.info('Context Manager initialized');
  }

  /**
   * Get current roots
   */
  getRoots(): Root[] {
    return this.getCurrentContext().roots;
  }

  /**
   * Update roots and adapt context
   */
  async updateRoots(roots: Root[]): Promise<void> {
    logger.info('Updating roots', { count: roots.length });
    
    const context = this.getCurrentContext();
    context.roots = roots;
    
    // Analyze and categorize roots
    for (const root of roots) {
      await this.processRoot(root);
    }
    
    // Update environment based on roots
    this.detectEnvironment();
    
    // Update capabilities based on available roots
    this.updateCapabilities();
    
    logger.info('Root update complete', {
      environment: context.environment,
      capabilities: Array.from(context.capabilities)
    });
  }

  /**
   * Get current context
   */
  getCurrentContext(): APIContext {
    return this.contexts.get(this.activeContextId)!;
  }

  /**
   * Switch to a different context
   */
  switchContext(contextId: string): void {
    if (this.contexts.has(contextId)) {
      this.activeContextId = contextId;
      logger.info(`Switched to context: ${contextId}`);
    } else {
      logger.warn(`Context not found: ${contextId}`);
    }
  }

  /**
   * Create a new context
   */
  createContext(id: string, baseContext?: Partial<APIContext>): APIContext {
    const context: APIContext = {
      environment: 'unknown',
      roots: [],
      capabilities: new Set(),
      configuration: new Map(),
      apiClients: new Map(),
      metadata: new Map(),
      operationHistory: [],
      sessionId: `session_${Date.now()}`,
      ...baseContext
    };
    
    this.contexts.set(id, context);
    return context;
  }

  /**
   * Add operation to history
   */
  trackOperation(operation: string): void {
    const context = this.getCurrentContext();
    context.operationHistory.push(operation);
    
    // Keep history size manageable
    if (context.operationHistory.length > 100) {
      context.operationHistory = context.operationHistory.slice(-50);
    }
  }

  /**
   * Get context for a specific tenant
   */
  getTenantContext(tenantId: string): APIContext | undefined {
    for (const [id, context] of this.contexts) {
      if (context.tenant === tenantId) {
        return context;
      }
    }
    return undefined;
  }

  /**
   * Process a root and extract context
   */
  private async processRoot(root: Root): Promise<void> {
    logger.debug(`Processing root: ${root.uri}`);
    
    // Determine root type and process accordingly
    if (root.uri.startsWith('https://') || root.uri.startsWith('http://')) {
      await this.processAPIRoot(root);
    } else if (root.uri.startsWith('file://')) {
      await this.processFileRoot(root);
    } else {
      await this.processCustomRoot(root);
    }
  }

  /**
   * Process API endpoint root
   */
  private async processAPIRoot(root: Root): Promise<void> {
    const context = this.getCurrentContext();
    const url = new URL(root.uri);
    
    // Detect environment from URL
    if (url.hostname.includes('.dev.') || url.hostname.includes('-dev')) {
      context.metadata.set(`${root.uri}_env`, 'development');
    } else if (url.hostname.includes('.staging.') || url.hostname.includes('-staging')) {
      context.metadata.set(`${root.uri}_env`, 'staging');
    } else if (url.hostname.includes('.prod.') || url.hostname.includes('-prod') || 
               (!url.hostname.includes('dev') && !url.hostname.includes('staging'))) {
      context.metadata.set(`${root.uri}_env`, 'production');
    }
    
    // Extract tenant if present
    const tenantMatch = url.pathname.match(/\/tenants?\/([^\/]+)/);
    if (tenantMatch) {
      context.tenant = tenantMatch[1];
      logger.info(`Detected tenant: ${context.tenant}`);
    }
    
    // Create API client for this root
    const clientId = `client_${root.uri}`;
    context.apiClients.set(clientId, {
      baseURL: root.uri,
      environment: context.metadata.get(`${root.uri}_env`),
      headers: {}
    });
    
    // Add capabilities based on API root
    context.capabilities.add('api_access');
    if (root.uri.includes('/v2') || root.uri.includes('/v3')) {
      context.capabilities.add('versioned_api');
    }
  }

  /**
   * Process file system root
   */
  private async processFileRoot(root: Root): Promise<void> {
    const context = this.getCurrentContext();
    const path = root.uri.replace('file://', '');
    
    // Check for configuration files
    if (path.endsWith('.json') || path.endsWith('.yaml') || path.endsWith('.yml')) {
      context.capabilities.add('local_config');
      context.configuration.set('configPath', path);
    }
    
    // Check for spec files
    if (path.includes('openapi') || path.includes('swagger')) {
      context.capabilities.add('local_spec');
      context.metadata.set('specPath', path);
    }
    
    // Check for test data
    if (path.includes('test') || path.includes('mock')) {
      context.capabilities.add('test_data');
      context.metadata.set('testDataPath', path);
    }
  }

  /**
   * Process custom protocol roots
   */
  private async processCustomRoot(root: Root): Promise<void> {
    const context = this.getCurrentContext();
    
    // Check for registered handlers
    for (const [pattern, handler] of this.rootHandlers) {
      if (root.uri.startsWith(pattern)) {
        await handler(root);
        return;
      }
    }
    
    // Default handling
    logger.warn(`Unknown root protocol: ${root.uri}`);
    context.capabilities.add('custom_protocol');
  }

  /**
   * Register custom root handlers
   */
  private registerRootHandlers(): void {
    // Discovery protocol handler
    this.rootHandlers.set('discovery://', async (root) => {
      const context = this.getCurrentContext();
      context.capabilities.add('api_discovery');
      context.metadata.set('discoveryEndpoint', root.uri);
      logger.info('API discovery endpoint registered');
    });
    
    // GraphQL handler
    this.rootHandlers.set('graphql://', async (root) => {
      const context = this.getCurrentContext();
      context.capabilities.add('graphql_api');
      context.metadata.set('graphqlEndpoint', root.uri.replace('graphql://', 'https://'));
    });
    
    // WebSocket handler
    this.rootHandlers.set('ws://', async (root) => {
      const context = this.getCurrentContext();
      context.capabilities.add('websocket_api');
      context.metadata.set('websocketEndpoint', root.uri);
    });
  }

  /**
   * Detect environment from all roots
   */
  private detectEnvironment(): void {
    const context = this.getCurrentContext();
    const environments = new Set<string>();
    
    // Collect all detected environments
    for (const [key, value] of context.metadata) {
      if (key.endsWith('_env')) {
        environments.add(value);
      }
    }
    
    // Determine primary environment
    if (environments.has('production')) {
      context.environment = 'production';
    } else if (environments.has('staging')) {
      context.environment = 'staging';
    } else if (environments.has('development')) {
      context.environment = 'development';
    } else if (context.roots.some(r => r.uri.startsWith('file://'))) {
      context.environment = 'local';
    } else {
      context.environment = 'unknown';
    }
    
    logger.info(`Environment detected: ${context.environment}`);
  }

  /**
   * Update capabilities based on roots
   */
  private updateCapabilities(): void {
    const context = this.getCurrentContext();
    
    // Multi-environment capability
    const envCount = new Set(
      Array.from(context.metadata.entries())
        .filter(([k]) => k.endsWith('_env'))
        .map(([_, v]) => v)
    ).size;
    
    if (envCount > 1) {
      context.capabilities.add('multi_environment');
    }
    
    // Hybrid capability (local + remote)
    const hasLocal = context.roots.some(r => r.uri.startsWith('file://'));
    const hasRemote = context.roots.some(r => 
      r.uri.startsWith('http://') || r.uri.startsWith('https://')
    );
    
    if (hasLocal && hasRemote) {
      context.capabilities.add('hybrid_mode');
    }
    
    // Testing capability
    if (context.capabilities.has('test_data') || context.environment === 'development') {
      context.capabilities.add('testing_enabled');
    }
    
    // Advanced features based on capabilities
    if (context.capabilities.size > 5) {
      context.capabilities.add('advanced_mode');
    }
  }

  /**
   * Create default context
   */
  private createDefaultContext(): APIContext {
    return {
      environment: 'unknown',
      roots: [],
      capabilities: new Set(['basic']),
      configuration: new Map(),
      apiClients: new Map(),
      metadata: new Map(),
      operationHistory: [],
      sessionId: `session_${Date.now()}`
    };
  }

  /**
   * Export context for debugging
   */
  exportContext(): any {
    const context = this.getCurrentContext();
    return {
      environment: context.environment,
      tenant: context.tenant,
      roots: context.roots,
      capabilities: Array.from(context.capabilities),
      configuration: Object.fromEntries(context.configuration),
      metadata: Object.fromEntries(context.metadata),
      operationHistory: context.operationHistory.slice(-10),
      sessionId: context.sessionId
    };
  }
}
