/**
 * SpecAnalyzer - Deep analysis of OpenAPI specifications
 * 
 * Goes beyond simple endpoint listing to understand:
 * - API intent and design patterns
 * - Resource relationships
 * - Common workflows
 * - Error patterns
 */

import { OpenAPISpec, Operation, PathItem } from '../types/openapi.js';
import { SpecAnalysis, WorkflowPattern, ResourceRelationship } from '../types/analysis.js';
import { logger } from '../utils/logger.js';

export class SpecAnalyzer {
  constructor(private spec: OpenAPISpec) {}

  /**
   * Perform comprehensive analysis of the OpenAPI spec
   */
  analyze(): SpecAnalysis {
    logger.debug('Starting spec analysis');
    
    const analysis: SpecAnalysis = {
      hasTools: false,
      hasResources: false,
      hasPrompts: false,
      endpoints: [],
      resources: [],
      workflows: [],
      relationships: [],
      errorPatterns: [],
      capabilities: {
        hasPagination: false,
        hasBatchOperations: false,
        hasWebhooks: false,
        hasAsyncOperations: false,
        hasAuthentication: false,
        hasRateLimiting: false
      }
    };

    // Analyze paths
    this.analyzePaths(analysis);
    
    // Analyze schemas
    this.analyzeSchemas(analysis);
    
    // Detect workflows
    this.detectWorkflows(analysis);
    
    // Analyze relationships
    this.analyzeRelationships(analysis);
    
    // Detect error patterns
    this.detectErrorPatterns(analysis);
    
    // Analyze capabilities
    this.analyzeCapabilities(analysis);
    
    // Determine what MCP features to generate
    this.determineMCPFeatures(analysis);
    
    logger.debug('Spec analysis complete', { analysis });
    return analysis;
  }

  /**
   * Analyze with additional context
   */
  analyzeWithContext(context: any): SpecAnalysis {
    const baseAnalysis = this.analyze();
    
    // Enhance analysis based on context
    if (context.environment === 'production') {
      baseAnalysis.capabilities.requiresStrictValidation = true;
    }
    
    if (context.roots?.some((r: any) => r.name.includes('test'))) {
      baseAnalysis.capabilities.hasTestMode = true;
    }
    
    return baseAnalysis;
  }

  /**
   * Analyze all paths in the specification
   */
  private analyzePaths(analysis: SpecAnalysis) {
    for (const [path, pathItem] of Object.entries(this.spec.paths || {})) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (this.isOperation(operation)) {
          const endpoint = {
            path,
            method: method.toUpperCase(),
            operation: operation as Operation,
            isAction: this.isActionEndpoint(method, operation as Operation),
            isResource: this.isResourceEndpoint(method, operation as Operation),
            complexity: this.calculateComplexity(operation as Operation)
          };
          
          analysis.endpoints.push(endpoint);
          
          // Determine if this should be a tool
          if (endpoint.isAction || endpoint.complexity > 2) {
            analysis.hasTools = true;
          }
        }
      }
    }
  }

  /**
   * Analyze schemas for resources
   */
  private analyzeSchemas(analysis: SpecAnalysis) {
    const schemas = this.spec.components?.schemas || {};
    
    for (const [name, schema] of Object.entries(schemas)) {
      analysis.resources.push({
        name,
        schema,
        isCore: this.isCoreResource(name, schema),
        relationships: this.findSchemaRelationships(name, schema)
      });
      
      analysis.hasResources = true;
    }
  }

  /**
   * Detect common workflow patterns
   */
  private detectWorkflows(analysis: SpecAnalysis) {
    // CRUD workflow detection
    const crudPatterns = this.detectCRUDPatterns(analysis.endpoints);
    analysis.workflows.push(...crudPatterns);
    
    // Authentication workflow
    if (this.hasAuthenticationFlow(analysis.endpoints)) {
      analysis.workflows.push({
        name: 'authentication',
        type: 'auth',
        steps: this.buildAuthWorkflow(analysis.endpoints)
      });
    }
    
    // Pagination workflow
    if (this.hasPaginationPattern(analysis.endpoints)) {
      analysis.workflows.push({
        name: 'pagination',
        type: 'navigation',
        steps: this.buildPaginationWorkflow(analysis.endpoints)
      });
    }
    
    // File upload workflow
    if (this.hasFileUploadPattern(analysis.endpoints)) {
      analysis.workflows.push({
        name: 'fileUpload',
        type: 'multipart',
        steps: this.buildFileUploadWorkflow(analysis.endpoints)
      });
    }
    
    if (analysis.workflows.length > 0) {
      analysis.hasPrompts = true;
    }
  }

  /**
   * Analyze relationships between resources
   */
  private analyzeRelationships(analysis: SpecAnalysis) {
    for (const resource of analysis.resources) {
      for (const relatedResource of resource.relationships) {
        analysis.relationships.push({
          from: resource.name,
          to: relatedResource,
          type: this.determineRelationshipType(resource.schema, relatedResource)
        });
      }
    }
  }

  /**
   * Detect common error patterns
   */
  private detectErrorPatterns(analysis: SpecAnalysis) {
    for (const endpoint of analysis.endpoints) {
      const responses = endpoint.operation.responses || {};
      
      for (const [statusCode, response] of Object.entries(responses)) {
        if (statusCode.startsWith('4') || statusCode.startsWith('5')) {
          analysis.errorPatterns.push({
            statusCode,
            endpoint: `${endpoint.method} ${endpoint.path}`,
            description: response.description || '',
            recoverable: this.isRecoverableError(statusCode, response)
          });
        }
      }
    }
  }

  /**
   * Analyze API capabilities
   */
  private analyzeCapabilities(analysis: SpecAnalysis) {
    // Pagination detection
    analysis.capabilities.hasPagination = analysis.endpoints.some(e => 
      this.hasPaginationParameters(e.operation)
    );
    
    // Batch operations
    analysis.capabilities.hasBatchOperations = analysis.endpoints.some(e =>
      e.path.includes('batch') || e.path.includes('bulk')
    );
    
    // Webhooks
    analysis.capabilities.hasWebhooks = !!this.spec.webhooks ||
      analysis.endpoints.some(e => e.path.includes('webhook'));
    
    // Async operations
    analysis.capabilities.hasAsyncOperations = analysis.endpoints.some(e =>
      e.operation.responses?.['202'] !== undefined
    );
    
    // Authentication
    analysis.capabilities.hasAuthentication = !!this.spec.components?.securitySchemes;
    
    // Rate limiting
    analysis.capabilities.hasRateLimiting = analysis.endpoints.some(e =>
      Object.values(e.operation.responses || {}).some((r: any) =>
        r.headers?.['X-RateLimit-Limit'] || r.headers?.['RateLimit-Limit']
      )
    );
  }

  /**
   * Determine which MCP features to generate
   */
  private determineMCPFeatures(analysis: SpecAnalysis) {
    // Already set hasTools, hasResources, hasPrompts
    
    // Additional intelligence
    if (analysis.workflows.length > 2 || analysis.capabilities.hasAsyncOperations) {
      analysis.requiresSampling = true;
    }
    
    if (analysis.relationships.length > 3) {
      analysis.requiresContextManagement = true;
    }
    
    if (analysis.errorPatterns.length > 5) {
      analysis.requiresErrorIntelligence = true;
    }
  }

  // Helper methods

  private isOperation(obj: any): boolean {
    return obj && typeof obj === 'object' && 
           ('summary' in obj || 'description' in obj || 'responses' in obj);
  }

  private isActionEndpoint(method: string, operation: Operation): boolean {
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase()) ||
           (operation.summary?.toLowerCase().includes('create') ||
            operation.summary?.toLowerCase().includes('update') ||
            operation.summary?.toLowerCase().includes('delete'));
  }

  private isResourceEndpoint(method: string, operation: Operation): boolean {
    return method.toUpperCase() === 'GET' &&
           !this.hasSideEffects(operation);
  }

  private hasSideEffects(operation: Operation): boolean {
    return operation.summary?.toLowerCase().includes('trigger') ||
           operation.summary?.toLowerCase().includes('send') ||
           operation.summary?.toLowerCase().includes('execute');
  }

  private calculateComplexity(operation: Operation): number {
    let complexity = 1;
    
    // Parameters
    const paramCount = (operation.parameters || []).length;
    complexity += Math.floor(paramCount / 3);
    
    // Request body
    if (operation.requestBody) {
      complexity += 1;
      // Nested schemas add complexity
      const schema = this.getRequestBodySchema(operation.requestBody);
      if (schema?.properties && Object.keys(schema.properties).length > 5) {
        complexity += 1;
      }
    }
    
    // Multiple response types
    const responseCount = Object.keys(operation.responses || {}).length;
    if (responseCount > 3) {
      complexity += 1;
    }
    
    return complexity;
  }

  private getRequestBodySchema(requestBody: any): any {
    return requestBody.content?.['application/json']?.schema;
  }

  private isCoreResource(name: string, schema: any): boolean {
    // Heuristics for core resources
    const corePatterns = ['user', 'account', 'organization', 'project', 'product'];
    return corePatterns.some(pattern => 
      name.toLowerCase().includes(pattern)
    );
  }

  private findSchemaRelationships(name: string, schema: any): string[] {
    const relationships: string[] = [];
    
    // Check properties for references
    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        if (propSchema.$ref) {
          const refName = this.extractRefName(propSchema.$ref);
          if (refName && refName !== name) {
            relationships.push(refName);
          }
        }
        
        // Array of references
        if (propSchema.type === 'array' && propSchema.items?.$ref) {
          const refName = this.extractRefName(propSchema.items.$ref);
          if (refName && refName !== name) {
            relationships.push(refName);
          }
        }
      }
    }
    
    return [...new Set(relationships)];
  }

  private extractRefName(ref: string): string | null {
    const match = ref.match(/#\/components\/schemas\/(.+)/);
    return match ? match[1] : null;
  }

  private determineRelationshipType(schema: any, relatedResource: string): string {
    // Simplified relationship type detection
    const propName = Object.entries(schema.properties || {})
      .find(([_, prop]: [string, any]) => 
        prop.$ref?.includes(relatedResource) ||
        prop.items?.$ref?.includes(relatedResource)
      )?.[0];
    
    if (!propName) return 'unknown';
    
    if (propName.endsWith('Id') || propName.endsWith('_id')) {
      return 'belongs_to';
    }
    
    if (propName.endsWith('s') || propName.endsWith('List')) {
      return 'has_many';
    }
    
    return 'has_one';
  }

  private detectCRUDPatterns(endpoints: any[]): WorkflowPattern[] {
    const patterns: WorkflowPattern[] = [];
    const resourcePaths = new Map<string, any[]>();
    
    // Group endpoints by resource
    for (const endpoint of endpoints) {
      const resourceMatch = endpoint.path.match(/^\/([^\/]+)/);
      if (resourceMatch) {
        const resource = resourceMatch[1];
        if (!resourcePaths.has(resource)) {
          resourcePaths.set(resource, []);
        }
        resourcePaths.get(resource)!.push(endpoint);
      }
    }
    
    // Check for CRUD patterns
    for (const [resource, endpoints] of resourcePaths) {
      const methods = endpoints.map(e => e.method);
      if (methods.includes('GET') && methods.includes('POST') &&
          methods.includes('PUT') && methods.includes('DELETE')) {
        patterns.push({
          name: `${resource}_crud`,
          type: 'crud',
          steps: [
            { action: 'list', endpoint: `GET /${resource}` },
            { action: 'create', endpoint: `POST /${resource}` },
            { action: 'read', endpoint: `GET /${resource}/{id}` },
            { action: 'update', endpoint: `PUT /${resource}/{id}` },
            { action: 'delete', endpoint: `DELETE /${resource}/{id}` }
          ]
        });
      }
    }
    
    return patterns;
  }

  private hasAuthenticationFlow(endpoints: any[]): boolean {
    return endpoints.some(e => 
      e.path.includes('auth') || 
      e.path.includes('login') ||
      e.path.includes('token')
    );
  }

  private buildAuthWorkflow(endpoints: any[]): any[] {
    // Simplified auth workflow
    return [
      { action: 'authenticate', description: 'Obtain credentials' },
      { action: 'validate', description: 'Validate credentials' },
      { action: 'authorize', description: 'Get access token' },
      { action: 'refresh', description: 'Refresh token if needed' }
    ];
  }

  private hasPaginationPattern(endpoints: any[]): boolean {
    return endpoints.some(e => 
      this.hasPaginationParameters(e.operation)
    );
  }

  private hasPaginationParameters(operation: Operation): boolean {
    const params = operation.parameters || [];
    return params.some((p: any) => 
      ['page', 'limit', 'offset', 'cursor'].includes(p.name.toLowerCase())
    );
  }

  private buildPaginationWorkflow(endpoints: any[]): any[] {
    return [
      { action: 'initial_request', description: 'Fetch first page' },
      { action: 'check_more', description: 'Check if more pages exist' },
      { action: 'fetch_next', description: 'Fetch next page' },
      { action: 'aggregate', description: 'Combine results' }
    ];
  }

  private hasFileUploadPattern(endpoints: any[]): boolean {
    return endpoints.some(e => 
      e.operation.requestBody?.content?.['multipart/form-data']
    );
  }

  private buildFileUploadWorkflow(endpoints: any[]): any[] {
    return [
      { action: 'prepare', description: 'Prepare file for upload' },
      { action: 'validate', description: 'Validate file requirements' },
      { action: 'upload', description: 'Upload file' },
      { action: 'verify', description: 'Verify upload success' }
    ];
  }

  private isRecoverableError(statusCode: string, response: any): boolean {
    const recoverableCodes = ['429', '503', '504'];
    return recoverableCodes.includes(statusCode) ||
           response.description?.toLowerCase().includes('retry');
  }
}
